"""Flood risk simulation module."""

import logging
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import WeatherObservation, RiverObservation
from app.simulation.base import BaseSimulator, SimulationResult
from app.simulation.registry import SimulatorRegistry

logger = logging.getLogger(__name__)


@SimulatorRegistry.register
class FloodSimulator(BaseSimulator):
    name = "Flood Risk Simulator"
    description = "Simulates flood risk based on rainfall, river levels, and soil conditions"
    simulation_type = "flood"

    @property
    def parameter_schema(self) -> dict:
        return {
            "rainfall_multiplier": {
                "type": "float", "min": 0.5, "max": 5.0, "default": 1.0,
                "description": "Multiplier for rainfall intensity"
            },
            "soil_saturation": {
                "type": "float", "min": 0.0, "max": 1.0, "default": 0.5,
                "description": "Soil saturation level (0=dry, 1=saturated)"
            },
            "river_level_offset": {
                "type": "float", "min": -2.0, "max": 5.0, "default": 0.0,
                "description": "Offset to river water levels in meters"
            },
            "return_period_years": {
                "type": "integer", "min": 10, "max": 500, "default": 100,
                "description": "Return period for extreme event analysis in years"
            },
        }

    async def validate_params(self, params: dict) -> dict:
        schema = self.parameter_schema
        validated = {}
        for key, spec in schema.items():
            value = params.get(key, spec["default"])
            if isinstance(value, str):
                value = float(value) if spec["type"] == "float" else int(value)
            if value < spec["min"] or value > spec["max"]:
                raise ValueError(
                    f"Parameter '{key}' must be between {spec['min']} and {spec['max']}, got {value}"
                )
            validated[key] = value
        return validated

    async def load_data(self, db, district_ids: list[int], date_range: tuple) -> pd.DataFrame:
        # Query weather data
        weather_query = select(WeatherObservation).where(
            WeatherObservation.district_id.in_(district_ids),
            WeatherObservation.date >= date_range[0],
            WeatherObservation.date <= date_range[1],
        )
        weather_result = await db.execute(weather_query)
        weather_rows = weather_result.scalars().all()

        weather_data = [{
            "district_id": w.district_id, "date": w.date,
            "rainfall_mm": w.rainfall_mm or 0, "humidity": w.humidity or 0,
            "temperature_avg": w.temperature_avg or 0,
        } for w in weather_rows]

        # Query river data
        river_query = select(RiverObservation).where(
            RiverObservation.district_id.in_(district_ids),
            RiverObservation.date >= date_range[0],
            RiverObservation.date <= date_range[1],
        )
        river_result = await db.execute(river_query)
        river_rows = river_result.scalars().all()

        river_data = [{
            "district_id": r.district_id, "date": r.date,
            "water_level_m": r.water_level_m or 0,
            "discharge_cumecs": r.discharge_cumecs or 0,
            "flood_status": r.flood_status or "normal",
            "danger_level_m": r.danger_level_m or 10.0,
            "warning_level_m": r.warning_level_m or 8.0,
        } for r in river_rows]

        weather_df = pd.DataFrame(weather_data) if weather_data else pd.DataFrame(
            columns=["district_id", "date", "rainfall_mm", "humidity", "temperature_avg"]
        )
        river_df = pd.DataFrame(river_data) if river_data else pd.DataFrame(
            columns=["district_id", "date", "water_level_m", "discharge_cumecs",
                     "flood_status", "danger_level_m", "warning_level_m"]
        )

        if weather_df.empty and river_df.empty:
            return pd.DataFrame()

        if not weather_df.empty and not river_df.empty:
            merged = pd.merge(weather_df, river_df, on=["district_id", "date"], how="outer")
        elif not weather_df.empty:
            merged = weather_df
        else:
            merged = river_df

        merged.fillna(0, inplace=True)
        return merged

    async def run(self, data: pd.DataFrame, params: dict) -> SimulationResult:
        if data.empty:
            return SimulationResult(
                district_results=[],
                summary={"error": "No data available for simulation"},
            )

        district_results = []
        severity_counts = {"low": 0, "medium": 0, "high": 0, "severe": 0, "critical": 0}

        for district_id, group in data.groupby("district_id"):
            avg_rainfall = group["rainfall_mm"].mean() if "rainfall_mm" in group.columns else 0
            avg_water_level = group["water_level_m"].mean() if "water_level_m" in group.columns else 0
            danger_level = group["danger_level_m"].mean() if "danger_level_m" in group.columns and group["danger_level_m"].mean() > 0 else 10.0

            rainfall_component = min(avg_rainfall * params["rainfall_multiplier"] / 200.0, 1.0) * 0.4
            river_component = min(avg_water_level / danger_level, 2.0) / 2.0 * 0.3
            saturation_component = params["soil_saturation"] * 0.3

            flood_risk_score = rainfall_component + river_component + saturation_component
            flood_risk_score = min(max(flood_risk_score, 0.0), 1.0)

            if flood_risk_score < 0.3:
                severity = "low"
            elif flood_risk_score < 0.5:
                severity = "medium"
            elif flood_risk_score < 0.7:
                severity = "high"
            elif flood_risk_score < 0.85:
                severity = "severe"
            else:
                severity = "critical"

            severity_counts[severity] += 1

            district_results.append({
                "district_id": int(district_id),
                "flood_risk_score": round(flood_risk_score, 4),
                "severity": severity,
                "avg_rainfall_mm": round(avg_rainfall, 2),
                "avg_water_level_m": round(avg_water_level, 2),
                "danger_level_m": round(danger_level, 2),
                "rainfall_component": round(rainfall_component, 4),
                "river_component": round(river_component, 4),
                "saturation_component": round(saturation_component, 4),
            })

        risk_scores = [r["flood_risk_score"] for r in district_results]
        summary = {
            "total_districts": len(district_results),
            "avg_flood_risk": round(sum(risk_scores) / len(risk_scores), 4) if risk_scores else 0,
            "max_flood_risk": round(max(risk_scores), 4) if risk_scores else 0,
            "min_flood_risk": round(min(risk_scores), 4) if risk_scores else 0,
            "severity_distribution": severity_counts,
            "parameters_used": params,
        }

        return SimulationResult(district_results=district_results, summary=summary)
