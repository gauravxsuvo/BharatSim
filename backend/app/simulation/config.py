"""Default configuration for simulation parameters.

Provides baseline parameter values and severity classification thresholds
used across all simulation modules. These defaults are merged with
user-supplied parameters at runtime.
"""

DEFAULT_PARAMS: dict[str, dict] = {
    "flood": {
        "rainfall_multiplier": 1.0,
        "soil_saturation": 0.5,
        "river_level_offset": 0.0,
        "return_period_years": 100,
    },
    "heatwave": {
        "temperature_offset": 0.0,
        "humidity_factor": 1.0,
        "urban_heat_island": 2.0,
        "duration_days": 3,
    },
    "crop_yield": {
        "rainfall_change_pct": 0,
        "temperature_change": 0.0,
        "irrigation_coverage": 0.5,
        "fertilizer_index": 1.0,
    },
    "air_quality": {
        "emission_factor": 1.0,
        "wind_speed_factor": 1.0,
        "industrial_activity": 1.0,
        "vehicle_density_factor": 1.0,
    },
}

SEVERITY_THRESHOLDS: dict[str, dict] = {
    "flood": {
        "low": 0.2,
        "medium": 0.4,
        "high": 0.6,
        "severe": 0.8,
        "critical": 0.9,
    },
    "heatwave": {
        "low": 0.2,
        "medium": 0.4,
        "high": 0.6,
        "severe": 0.8,
        "critical": 0.9,
    },
    "crop_yield": {
        "low": -5,
        "medium": -15,
        "high": -25,
        "severe": -40,
        "critical": -60,
    },
    "air_quality": {
        "good": 50,
        "moderate": 100,
        "unhealthy_sensitive": 150,
        "unhealthy": 200,
        "very_unhealthy": 300,
        "hazardous": 500,
    },
}
