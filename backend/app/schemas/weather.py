"""Pydantic schemas for weather observation data.

Defines request and response schemas used by the weather/datasets API
endpoints.
"""

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class WeatherBase(BaseModel):
    """Base schema for weather observation data.

    All measurement fields are optional to support partial observations.
    """

    district_id: int = Field(..., description="District ID")
    date: date = Field(..., description="Observation date")
    temperature_max: float | None = Field(
        None, description="Max temperature in Celsius"
    )
    temperature_min: float | None = Field(
        None, description="Min temperature in Celsius"
    )
    temperature_avg: float | None = Field(
        None, description="Average temperature in Celsius"
    )
    humidity: float | None = Field(
        None, ge=0, le=100, description="Humidity percentage"
    )
    rainfall_mm: float | None = Field(
        None, ge=0, description="Rainfall in mm"
    )
    wind_speed: float | None = Field(
        None, ge=0, description="Wind speed in km/h"
    )
    wind_direction: float | None = Field(
        None, ge=0, le=360, description="Wind direction in degrees"
    )
    pressure: float | None = Field(
        None, description="Atmospheric pressure in hPa"
    )
    visibility: float | None = Field(
        None, ge=0, description="Visibility in km"
    )
    cloud_cover: float | None = Field(
        None, ge=0, le=100, description="Cloud cover percentage"
    )
    solar_radiation: float | None = Field(
        None, ge=0, description="Solar radiation in W/m²"
    )


class WeatherCreate(WeatherBase):
    """Schema for creating a weather observation record."""

    pass


class WeatherResponse(WeatherBase):
    """Schema for weather observation response with database fields."""

    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WeatherSummary(BaseModel):
    """Aggregated weather statistics for a district over a date range.

    Attributes:
        district_id: District ID the summary applies to.
        avg_temp: Average temperature across the period.
        total_rainfall: Cumulative rainfall in mm.
        avg_humidity: Average relative humidity percentage.
        date_range: Human-readable date range string.
    """

    district_id: int
    avg_temp: float | None = None
    total_rainfall: float | None = None
    avg_humidity: float | None = None
    date_range: str = Field(
        ..., description="Date range as 'YYYY-MM-DD to YYYY-MM-DD'"
    )
