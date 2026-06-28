"""Dashboard router – heatmap, timeseries, and summary statistics."""

from datetime import date as DateType

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import District, WeatherObservation, RiverObservation, SimulationRun

router = APIRouter(tags=["Dashboard"])


# ---------------------------------------------------------------------------
# GET /heatmap
# ---------------------------------------------------------------------------
@router.get("/heatmap")
async def heatmap(
    metric: str = Query(..., regex="^(temperature|rainfall|aqi|flood_risk)$"),
    db: AsyncSession = Depends(get_db),
):
    if metric == "aqi":
        return []

    if metric in ("temperature", "rainfall"):
        # Subquery: latest observation date per district
        latest_sub = (
            select(
                WeatherObservation.district_id,
                func.max(WeatherObservation.date).label("max_date"),
            )
            .group_by(WeatherObservation.district_id)
            .subquery()
        )

        value_col = (
            WeatherObservation.temperature_avg
            if metric == "temperature"
            else WeatherObservation.rainfall_mm
        )

        stmt = (
            select(
                District.id.label("district_id"),
                District.name.label("district_name"),
                District.latitude.label("lat"),
                District.longitude.label("lon"),
                value_col.label("value"),
            )
            .join(WeatherObservation, WeatherObservation.district_id == District.id)
            .join(
                latest_sub,
                (WeatherObservation.district_id == latest_sub.c.district_id)
                & (WeatherObservation.date == latest_sub.c.max_date),
            )
        )

        rows = (await db.execute(stmt)).all()
        return [
            {
                "district_id": r.district_id,
                "district_name": r.district_name,
                "lat": float(r.lat) if r.lat is not None else None,
                "lon": float(r.lon) if r.lon is not None else None,
                "value": float(r.value) if r.value is not None else None,
            }
            for r in rows
        ]

    if metric == "flood_risk":
        latest_sub = (
            select(
                RiverObservation.district_id,
                func.max(RiverObservation.date).label("max_date"),
            )
            .group_by(RiverObservation.district_id)
            .subquery()
        )

        stmt = (
            select(
                District.id.label("district_id"),
                District.name.label("district_name"),
                District.latitude.label("lat"),
                District.longitude.label("lon"),
                (
                    RiverObservation.water_level_m / RiverObservation.danger_level_m
                ).label("value"),
            )
            .join(RiverObservation, RiverObservation.district_id == District.id)
            .join(
                latest_sub,
                (RiverObservation.district_id == latest_sub.c.district_id)
                & (RiverObservation.date == latest_sub.c.max_date),
            )
        )

        rows = (await db.execute(stmt)).all()
        return [
            {
                "district_id": r.district_id,
                "district_name": r.district_name,
                "lat": float(r.lat) if r.lat is not None else None,
                "lon": float(r.lon) if r.lon is not None else None,
                "value": float(r.value) if r.value is not None else None,
            }
            for r in rows
        ]

    raise HTTPException(status_code=400, detail=f"Unknown metric: {metric}")


# ---------------------------------------------------------------------------
# GET /timeseries
# ---------------------------------------------------------------------------
@router.get("/timeseries")
async def timeseries(
    district_id: int = Query(...),
    metric: str = Query(..., regex="^(temperature|rainfall|humidity|water_level)$"),
    date_from: DateType | None = Query(default=None),
    date_to: DateType | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    if metric in ("temperature", "rainfall", "humidity"):
        column_map = {
            "temperature": WeatherObservation.temperature_avg,
            "rainfall": WeatherObservation.rainfall_mm,
            "humidity": WeatherObservation.humidity,
        }
        value_col = column_map[metric]

        stmt = (
            select(WeatherObservation.date, value_col.label("value"))
            .where(WeatherObservation.district_id == district_id)
            .order_by(WeatherObservation.date)
        )

        if date_from is not None:
            stmt = stmt.where(WeatherObservation.date >= date_from)
        if date_to is not None:
            stmt = stmt.where(WeatherObservation.date <= date_to)

        rows = (await db.execute(stmt)).all()
        return [
            {"date": r.date.isoformat(), "value": float(r.value) if r.value is not None else None}
            for r in rows
        ]

    if metric == "water_level":
        stmt = (
            select(RiverObservation.date, RiverObservation.water_level_m.label("value"))
            .where(RiverObservation.district_id == district_id)
            .order_by(RiverObservation.date)
        )

        if date_from is not None:
            stmt = stmt.where(RiverObservation.date >= date_from)
        if date_to is not None:
            stmt = stmt.where(RiverObservation.date <= date_to)

        rows = (await db.execute(stmt)).all()
        return [
            {"date": r.date.isoformat(), "value": float(r.value) if r.value is not None else None}
            for r in rows
        ]

    raise HTTPException(status_code=400, detail=f"Unknown metric: {metric}")


# ---------------------------------------------------------------------------
# GET /stats
# ---------------------------------------------------------------------------
@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    total_districts = (await db.execute(select(func.count(District.id)))).scalar() or 0
    total_weather_records = (
        await db.execute(select(func.count(WeatherObservation.id)))
    ).scalar() or 0
    total_river_records = (
        await db.execute(select(func.count(RiverObservation.id)))
    ).scalar() or 0
    total_simulations = (
        await db.execute(select(func.count(SimulationRun.id)))
    ).scalar() or 0
    latest_data_date_raw = (
        await db.execute(select(func.max(WeatherObservation.date)))
    ).scalar()

    return {
        "total_districts": total_districts,
        "total_weather_records": total_weather_records,
        "total_river_records": total_river_records,
        "total_simulations": total_simulations,
        "latest_data_date": latest_data_date_raw.isoformat() if latest_data_date_raw else None,
    }
