"""Air quality simulation module."""

import logging
import pandas as pd
from sqlalchemy import select

from app.models import WeatherObservation
from app.simulation.base import BaseSimulator, SimulationResult
from app.simulation.registry import SimulatorRegistry

logger = logging.getLogger(__name__)


@SimulatorRegistry.register
class AirQualitySimulator(BaseSimulator):
    name = "Air Quality Simulator"
    description = "Simulates Air Quality Index based on emissions, weather, and urban factors"
    simulation_type = "air_quality"

    @property
    def parameter_schema(self) -> dict:
        return {
            "emission_factor": {
                "type": "float", "min": 0.5, "max": 3.0, "default": 1.0,
                "description": "Emission intensity multiplier"
            },
            "wind_speed_factor": {
                "type": "float", "min": 0.5, "max": 2.0, "default": 1.0,
                "description": "Wind speed scaling factor"
            },
            "industrial_activity": {
                "type": "float", "min": 0.0, "max": 1.0, "default": 0.5,
                "description": "Industrial activity level (0=none, 1=maximum)"
            },
            "vehicle_density_factor": {
                "type": "float", "min": 0.5, "max": 3.0, "default": 1.0,
                "description": "Vehicle density scaling factor"
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
            "temperature_avg": w.temperature_avg or 25.0,
            "humidity": w.humidity or 50.0,
            "wind_speed": w.wind_speed or 5.0,
            "pressure": w.pressure or 1013.0,
            "cloud_cover": w.cloud_cover or 50.0,
        } for w in rows]

        return pd.DataFrame(data) if data else pd.DataFrame(
            columns=["district_id", "date", "temperature_avg", "humidity",
                     "wind_speed", "pressure", "cloud_cover"]
        )

    async def run(self, data: pd.DataFrame, params: dict) -> SimulationResult:
        if data.empty:
            return SimulationResult(
                district_results=[],
                summary={"error": "No data available for simulation"},
            )

        AQI_CATEGORIES = [
            (50, "Good"),
            (100, "Satisfactory"),
            (200, "Moderate"),
            (300, "Poor"),
            (400, "Very Poor"),
            (500, "Severe"),
        ]

        district_results = []
        category_counts = {cat: 0 for _, cat in AQI_CATEGORIES}

        for district_id, group in data.groupby("district_id"):
            base_aqi = 100.0 * params["emission_factor"]

            avg_wind = group["wind_speed"].mean() * params["wind_speed_factor"]
            wind_dispersion = max(0.3, 1.0 - avg_wind / 30.0)

            industrial_contribution = params["industrial_activity"] * 80.0
            vehicle_contribution = params["vehicle_density_factor"] * 60.0

            avg_humidity = group["humidity"].mean()
            humidity_factor_val = 1.0 + (avg_humidity - 50.0) / 200.0

            final_aqi = (
                base_aqi * wind_dispersion
                + industrial_contribution
                + vehicle_contribution
            ) * humidity_factor_val

            final_aqi = max(0.0, min(final_aqi, 500.0))

            category = "Severe"
            for threshold, cat in AQI_CATEGORIES:
                if final_aqi <= threshold:
                    category = cat
                    break

            category_counts[category] = category_counts.get(category, 0) + 1

            district_results.append({
                "district_id": int(district_id),
                "aqi": round(final_aqi, 1),
                "category": category,
                "base_aqi": round(base_aqi, 1),
                "wind_dispersion_factor": round(wind_dispersion, 4),
                "industrial_contribution": round(industrial_contribution, 1),
                "vehicle_contribution": round(vehicle_contribution, 1),
                "humidity_factor": round(humidity_factor_val, 4),
                "avg_wind_speed": round(avg_wind, 2),
                "avg_humidity": round(avg_humidity, 2),
            })

        aqi_values = [r["aqi"] for r in district_results]
        summary = {
            "total_districts": len(district_results),
            "avg_aqi": round(sum(aqi_values) / len(aqi_values), 1) if aqi_values else 0,
            "max_aqi": round(max(aqi_values), 1) if aqi_values else 0,
            "min_aqi": round(min(aqi_values), 1) if aqi_values else 0,
            "category_distribution": category_counts,
            "parameters_used": params,
        }

        return SimulationResult(district_results=district_results, summary=summary)
