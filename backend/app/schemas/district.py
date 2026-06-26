"""Pydantic schemas for district data.

Defines request and response schemas used by the districts API endpoints.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DistrictBase(BaseModel):
    """Base schema for district data shared across create and response.

    Attributes:
        name: District name (e.g. "Pune").
        state_name: State or union territory name.
        state_code: Two-letter state code.
        district_code: Unique census district code.
        area_sq_km: Area in square kilometers.
        centroid_lat: Latitude of the district centroid.
        centroid_lon: Longitude of the district centroid.
    """

    name: str = Field(
        ..., min_length=1, max_length=255, description="District name"
    )
    state_name: str = Field(
        ..., min_length=1, max_length=255, description="State name"
    )
    state_code: str | None = Field(
        None, max_length=10, description="State code"
    )
    district_code: str | None = Field(
        None, max_length=10, description="Unique district code"
    )
    area_sq_km: float | None = Field(
        None, ge=0, description="Area in square kilometers"
    )
    centroid_lat: float | None = Field(
        None, ge=-90, le=90, description="Centroid latitude"
    )
    centroid_lon: float | None = Field(
        None, ge=-180, le=180, description="Centroid longitude"
    )


class DistrictCreate(DistrictBase):
    """Schema for creating a new district record.

    Extends DistrictBase with the required GeoJSON geometry.
    """

    geometry: dict = Field(..., description="GeoJSON geometry object")


class DistrictResponse(DistrictBase):
    """Schema for district response with database-generated fields."""

    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DistrictGeoJSON(BaseModel):
    """GeoJSON Feature representation of a district for map rendering."""

    type: str = "Feature"
    properties: dict
    geometry: dict


class DistrictListResponse(BaseModel):
    """Paginated response schema for listing districts.

    Attributes:
        districts: List of district response objects.
        total: Total count of districts matching the query.
    """

    districts: list[DistrictResponse]
    total: int
