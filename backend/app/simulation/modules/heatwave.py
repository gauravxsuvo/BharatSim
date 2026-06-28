"""Heatwave simulation module using IMD criteria."""

import logging
import pandas as pd
from sqlalchemy import select

from app.models import WeatherObservation
from app.simulation.base import BaseSimulator, SimulationResult
from app.simulation.registry import SimulatorRegistry

logger = logging.getLogger(__name__)


@SimulatorRegistry.register
class HeatwaveSimulator(BaseSimulator):
    name = "Heatwave Simulator"
    description = "Simulates heatwave conditions using IMD criteria and heat index calculations"
    simulation_type = "heatwave"

    @property
    def parameter_schema(self) -> dict:
        return {
            "temperature_offset": {
                "type": "float", "min": -5.0, "max": 15.0, "default": 0.0,
                "description": "Temperature offset in degrees Celsius"
            },
            "humidity_factor": {
                "type": "float", "min": 0.5, "max": 2.0, "default": 1.0,
                "description": "Multiplier for humidity levels"
            },
            "urban_heat_island": {
                "type": "float", "min": 0.0, "max": 5.0, "default": 2.0,
                "description": "Urban heat island effect in degrees Celsius"
            },
            "duration_days": {
                "type": "integer", "min": 1, "max": 30, "default": 3,
                "description": "Minimum consecutive days for heatwave classification"
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
        ).order_by(WeatherObservation.district_id, WeatherObservation.date)
        result = await db.execute(query)
        rows = result.scalars().all()

        data = [{
            "district_id": w.district_id,
            "date": w.date,
            "temperature_max": w.temperature_max or 0,
            "temperature_min": w.temperature_min or 0,
            "temperature_avg": w.temperature_avg or 0,
            "humidity": w.humidity or 0,
            "wind_speed": w.wind_speed or 0,
            "solar_radiation": w.solar_radiation or 0,
        } for w in rows]

        return pd.DataFrame(data) if data else pd.DataFrame(
            columns=["district_id", "date", "temperature_max", "temperature_min",
                     "temperature_avg", "humidity", "wind_speed", "solar_radiation"]
        )

    def _calculate_heat_index(self, temp_c: float, humidity: float) -> float:
        """Calculate heat index using simplified Rothfusz regression."""
        temp_f = temp_c * 9.0 / 5.0 + 32.0
        if temp_f < 80:
            return temp_c
        rh = min(max(humidity, 0), 100)
        hi_f = (
            -42.379
            + 2.04901523 * temp_f
            + 10.14333127 * rh
            - 0.22475541 * temp_f * rh
            - 0.00683783 * temp_f ** 2
            - 0.05481717 * rh ** 2
            + 0.00122874 * temp_f ** 2 * rh
            + 0.00085282 * temp_f * rh ** 2
            - 0.00000199 * temp_f ** 2 * rh ** 2
        )
        return (hi_f - 32.0) * 5.0 / 9.0

    async def run(self, data: pd.DataFrame, params: dict) -> SimulationResult:
        if data.empty:
            return SimulationResult(
                district_results=[],
                summary={"error": "No data available for simulation"},
            )

        NORMAL_TEMP_PLAINS = 35.0
        HEATWAVE_THRESHOLD_PLAINS = 40.0
        DEPARTURE_THRESHOLD = 4.5
        HEATWAVE_THRESHOLD_HILLS = 30.0

        district_results = []
        severity_counts = {"none": 0, "moderate": 0, "severe": 0, "extreme": 0}

        for district_id, group in data.groupby("district_id"):
            adjusted_temp_max = (
                group["temperature_max"]
                + params["temperature_offset"]
                + params["urban_heat_island"]
            )
            adjusted_humidity = group["humidity"] * params["humidity_factor"]
            adjusted_humidity = adjusted_humidity.clip(0, 100)

            heatwave_days = 0
            heat_indices = []
            max_temp_recorded = adjusted_temp_max.max()
            consecutive_hot_days = 0
            max_consecutive = 0

            for idx in range(len(group)):
                temp = adjusted_temp_max.iloc[idx]
                hum = adjusted_humidity.iloc[idx]

                hi = self._calculate_heat_index(temp, hum)
                heat_indices.append(hi)

                departure = temp - NORMAL_TEMP_PLAINS
                is_heatwave_day = (
                    temp > HEATWAVE_THRESHOLD_PLAINS or departure > DEPARTURE_THRESHOLD
                )

                if is_heatwave_day:
                    consecutive_hot_days += 1
                    max_consecutive = max(max_consecutive, consecutive_hot_days)
                else:
                    consecutive_hot_days = 0

                if is_heatwave_day:
                    heatwave_days += 1

            avg_heat_index = sum(heat_indices) / len(heat_indices) if heat_indices else 0
            heatwave_declared = max_consecutive >= params["duration_days"]

            if heatwave_days == 0:
                severity = "none"
            elif heatwave_days <= 2:
                severity = "moderate"
            elif heatwave_days <= 5:
                severity = "severe"
            else:
                severity = "extreme"

            severity_counts[severity] += 1

            district_results.append({
                "district_id": int(district_id),
                "heatwave_days": int(heatwave_days),
                "max_consecutive_hot_days": int(max_consecutive),
                "heatwave_declared": heatwave_declared,
                "severity": severity,
                "max_temperature_c": round(float(max_temp_recorded), 2),
                "avg_heat_index_c": round(avg_heat_index, 2),
                "avg_adjusted_temp_max": round(float(adjusted_temp_max.mean()), 2),
                "avg_adjusted_humidity": round(float(adjusted_humidity.mean()), 2),
            })

        hw_days_list = [r["heatwave_days"] for r in district_results]
        summary = {
            "total_districts": len(district_results),
            "districts_with_heatwave": sum(1 for r in district_results if r["heatwave_declared"]),
            "avg_heatwave_days": round(sum(hw_days_list) / len(hw_days_list), 2) if hw_days_list else 0,
            "max_heatwave_days": max(hw_days_list) if hw_days_list else 0,
            "severity_distribution": severity_counts,
            "parameters_used": params,
        }

        return SimulationResult(district_results=district_results, summary=summary)
