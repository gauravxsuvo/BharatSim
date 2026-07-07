"""District management API routes.

Provides CRUD operations and GeoJSON export for Indian administrative
districts with spatial query support.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.district import District
from app.schemas.district import (
    DistrictCreate,
    DistrictGeoJSON,
    DistrictListResponse,
    DistrictResponse,
)

router = APIRouter(tags=["districts"])


@router.get("/", response_model=DistrictListResponse)
async def list_districts(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    state: str | None = Query(None, description="Filter by state name"),
    search: str | None = Query(None, description="Search by district name"),
    db: AsyncSession = Depends(get_db),
) -> DistrictListResponse:
    """List all districts with optional filtering and pagination.

    Args:
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        state: Optional case-insensitive state name filter.
        search: Optional case-insensitive district name search.
        db: Async database session (injected).

    Returns:
        Paginated list of districts with total count.
    """
    query = select(District)
    count_query = select(func.count(District.id))

    if state:
        query = query.where(District.state_name.ilike(f"%{state}%"))
        count_query = count_query.where(
            District.state_name.ilike(f"%{state}%")
        )
    if search:
        query = query.where(District.name.ilike(f"%{search}%"))
        count_query = count_query.where(
            District.name.ilike(f"%{search}%")
        )

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        query.offset(skip).limit(limit).order_by(District.name)
    )
    districts = result.scalars().all()

    return DistrictListResponse(
        districts=[
            DistrictResponse.model_validate(d) for d in districts
        ],
        total=total,
    )


@router.get("/geojson", response_model=dict)
async def get_all_districts_geojson(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get all districts as a GeoJSON FeatureCollection."""
    result = await db.execute(select(District))
    districts = result.scalars().all()

    from geoalchemy2.shape import to_shape
    from shapely.geometry import mapping

    features = []
    for district in districts:
        geom = to_shape(district.geometry)
        features.append({
            "type": "Feature",
            "properties": {
                "id": district.id,
                "name": district.name,
                "state_name": district.state_name,
                "state_code": district.state_code,
                "district_code": district.district_code,
                "area_sq_km": district.area_sq_km,
            },
            "geometry": mapping(geom),
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@router.get("/{district_id}", response_model=DistrictResponse)
async def get_district(
    district_id: int,
    db: AsyncSession = Depends(get_db),
) -> DistrictResponse:
    """Get a specific district by ID.

    Args:
        district_id: Primary key of the district.
        db: Async database session (injected).

    Returns:
        District details.

    Raises:
        HTTPException: 404 if district not found.
    """
    result = await db.execute(
        select(District).where(District.id == district_id)
    )
    district = result.scalar_one_or_none()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")
    return DistrictResponse.model_validate(district)


@router.post("/", response_model=DistrictResponse, status_code=201)
async def create_district(
    payload: DistrictCreate,
    db: AsyncSession = Depends(get_db),
) -> DistrictResponse:
    """Create a new district record.

    Args:
        payload: District creation data including GeoJSON geometry.
        db: Async database session (injected).

    Returns:
        The newly created district.
    """


    from geoalchemy2.shape import from_shape
    from shapely.geometry import shape

    geom = shape(payload.geometry)
    district = District(
        name=payload.name,
        state_name=payload.state_name,
        state_code=payload.state_code,
        district_code=payload.district_code,
        geometry=from_shape(geom, srid=4326),
        area_sq_km=payload.area_sq_km,
        centroid_lat=payload.centroid_lat,
        centroid_lon=payload.centroid_lon,
    )
    db.add(district)
    await db.commit()
    await db.refresh(district)
    return DistrictResponse.model_validate(district)


@router.get("/{district_id}/geojson", response_model=DistrictGeoJSON)
async def get_district_geojson(
    district_id: int,
    db: AsyncSession = Depends(get_db),
) -> DistrictGeoJSON:
    """Get a district as a GeoJSON Feature for map rendering.

    Args:
        district_id: Primary key of the district.
        db: Async database session (injected).

    Returns:
        GeoJSON Feature with properties and geometry.

    Raises:
        HTTPException: 404 if district not found.
    """
    result = await db.execute(
        select(District).where(District.id == district_id)
    )
    district = result.scalar_one_or_none()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")

    from geoalchemy2.shape import to_shape
    from shapely.geometry import mapping

    geom = to_shape(district.geometry)
    return DistrictGeoJSON(
        type="Feature",
        properties={
            "id": district.id,
            "name": district.name,
            "state_name": district.state_name,
            "state_code": district.state_code,
            "district_code": district.district_code,
            "area_sq_km": district.area_sq_km,
        },
        geometry=mapping(geom),
    )


@router.delete("/{district_id}", status_code=204)
async def delete_district(
    district_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a district by ID.

    Args:
        district_id: Primary key of the district.
        db: Async database session (injected).

    Raises:
        HTTPException: 404 if district not found.
    """
    result = await db.execute(
        select(District).where(District.id == district_id)
    )
    district = result.scalar_one_or_none()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")

    await db.delete(district)
    await db.commit()
