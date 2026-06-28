"""Crop yield simulation module."""

import logging
import pandas as pd
from sqlalchemy import select

from app.models import WeatherObservation
from app.simulation.base import BaseSimulator, SimulationResult
from app.simulation.registry import SimulatorRegistry

logger = logging.getLogger(__name__)


@SimulatorRegistry.register
class CropYieldSimulator(BaseSimulator):
    name = "Crop Yield Simulator"
    description = "Estimates crop yield based on weather conditions and agricultural inputs"
    simulation_type = "crop_yield"

    BASE_YIELD_TONS_PER_HECTARE = 2.5
    OPTIMAL_RAINFALL_MIN = 800.0
    OPTIMAL_RAINFALL_MAX = 1200.0

    @property
    def parameter_schema(self) -> dict:
        return {
            "rainfall_change_pct": {
                "type": "float", "min": -50.0, "max": 100.0, "default": 0.0,
                "description": "Percentage change in rainfall from baseline"
            },
            "temperature_change": {
                "type": "float", "min": -5.0, "max": 10.0, "default": 0.0,
                "description": "Temperature change in degrees Celsius"
            },
            "irrigation_coverage": {
                "type": "float", "min": 0.0, "max": 1.0, "default": 0.5,
                "description": "Fraction of cultivated area under irrigation"
            },
            "fertilizer_index": {
                "type": "float", "min": 0.0, "max": 2.0, "default": 1.0,
                "description": "Fertilizer usage index (1.0 = normal)"
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
        query = select(WeatherObservation).where(
            WeatherObservation.district_id.in_(district_ids),
            WeatherObservation.date >= date_range[0],
            WeatherObservation.date <= date_range[1],
        )
        result = await db.execute(query)
        rows = result.scalars().all()

        data = [{
            "district_id": w.district_id,
            "date": w.date,
            "temperature_max": w.temperature_max or 0,
            "temperature_min": w.temperature_min or 0,
            "temperature_avg": w.temperature_avg or 0,
            "humidity": w.humidity or 0,
            "rainfall_mm": w.rainfall_mm or 0,
            "solar_radiation": w.solar_radiation or 0,
        } for w in rows]

        return pd.DataFrame(data) if data else pd.DataFrame(
            columns=["district_id", "date", "temperature_max", "temperature_min",
                     "temperature_avg", "humidity", "rainfall_mm", "solar_radiation"]
        )

    async def run(self, data: pd.DataFrame, params: dict) -> SimulationResult:
        if data.empty:
            return SimulationResult(
                district_results=[],
                summary={"error": "No data available for simulation"},
            )

        district_results = []

        for district_id, group in data.groupby("district_id"):
            total_rainfall = group["rainfall_mm"].sum() * (1 + params["rainfall_change_pct"] / 100.0)
            avg_temp = group["temperature_avg"].mean() + params["temperature_change"]

            # Water stress factor
            if total_rainfall < self.OPTIMAL_RAINFALL_MIN:
                water_stress = max(total_rainfall / self.OPTIMAL_RAINFALL_MIN, 0.1)
            elif total_rainfall > self.OPTIMAL_RAINFALL_MAX:
                excess = total_rainfall - self.OPTIMAL_RAINFALL_MAX
                water_stress = max(1.0 - excess / self.OPTIMAL_RAINFALL_MAX, 0.1)
            else:
                water_stress = 1.0

            # Heat stress factor
            if avg_temp <= 35.0:
                heat_stress = 1.0
            else:
                heat_stress = max(0.1, 1.0 - (avg_temp - 35.0) * 0.1)

            # Input quality factor
            input_quality = 0.5 + params["irrigation_coverage"] * 0.3 + params["fertilizer_index"] * 0.2

            estimated_yield = self.BASE_YIELD_TONS_PER_HECTARE * water_stress * heat_stress * input_quality
            yield_change_pct = ((estimated_yield - self.BASE_YIELD_TONS_PER_HECTARE) / self.BASE_YIELD_TONS_PER_HECTARE) * 100.0

            # Classify yield outlook
            if yield_change_pct > 10:
                outlook = "excellent"
            elif yield_change_pct > 0:
                outlook = "good"
            elif yield_change_pct > -10:
                outlook = "moderate"
            elif yield_change_pct > -25:
                outlook = "poor"
            else:
                outlook = "critical"

            district_results.append({
                "district_id": int(district_id),
                "estimated_yield_tons_per_hectare": round(estimated_yield, 3),
                "yield_change_pct": round(yield_change_pct, 2),
                "outlook": outlook,
                "total_rainfall_mm": round(total_rainfall, 2),
                "avg_temperature_c": round(avg_temp, 2),
                "water_stress_factor": round(water_stress, 4),
                "heat_stress_factor": round(heat_stress, 4),
                "input_quality_factor": round(input_quality, 4),
            })

        yields = [r["estimated_yield_tons_per_hectare"] for r in district_results]
        changes = [r["yield_change_pct"] for r in district_results]
        outlook_counts = {}
        for r in district_results:
            outlook_counts[r["outlook"]] = outlook_counts.get(r["outlook"], 0) + 1

        summary = {
            "total_districts": len(district_results),
            "avg_yield_tons_per_hectare": round(sum(yields) / len(yields), 3) if yields else 0,
            "avg_yield_change_pct": round(sum(changes) / len(changes), 2) if changes else 0,
            "max_yield": round(max(yields), 3) if yields else 0,
            "min_yield": round(min(yields), 3) if yields else 0,
            "outlook_distribution": outlook_counts,
            "parameters_used": params,
        }

        return SimulationResult(district_results=district_results, summary=summary)
