"""Database seed script for BharatSim.

Usage: python -m app.seed (from the backend directory)
"""

import asyncio
import csv
import logging
import os
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import select, func

from app.database import engine, async_session, Base
from app.models import District, WeatherObservation, RiverObservation, PopulationData

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# District seed data: (name, state_name, state_code, district_code, lon, lat, area_sq_km)
DISTRICT_DATA = [
    ("Mumbai", "Maharashtra", "MH", "MH001", 72.8, 18.9, 603.0),
    ("Pune", "Maharashtra", "MH", "MH002", 73.8, 18.5, 15643.0),
    ("Chennai", "Tamil Nadu", "TN", "TN001", 80.2, 13.0, 426.0),
    ("Coimbatore", "Tamil Nadu", "TN", "TN002", 76.9, 11.0, 4723.0),
    ("Lucknow", "Uttar Pradesh", "UP", "UP001", 80.9, 26.8, 2528.0),
    ("Varanasi", "Uttar Pradesh", "UP", "UP002", 83.0, 25.3, 1535.0),
    ("Jaipur", "Rajasthan", "RJ", "RJ001", 75.7, 26.9, 11152.0),
    ("Jodhpur", "Rajasthan", "RJ", "RJ002", 73.0, 26.3, 22850.0),
    ("Kolkata", "West Bengal", "WB", "WB001", 88.3, 22.5, 205.0),
    ("Darjeeling", "West Bengal", "WB", "WB002", 88.2, 27.0, 3149.0),
]


_COMPASS_DEG = {
    "N": 0, "NNE": 22.5, "NE": 45, "ENE": 67.5, "E": 90, "ESE": 112.5,
    "SE": 135, "SSE": 157.5, "S": 180, "SSW": 202.5, "SW": 225, "WSW": 247.5,
    "W": 270, "WNW": 292.5, "NW": 315, "NNW": 337.5,
}


def _wind_dir_to_deg(value) -> float:
    """Parse a wind direction that may be numeric degrees or a compass string."""
    if value is None or value == "":
        return 0.0
    try:
        return float(value)
    except (ValueError, TypeError):
        return _COMPASS_DEG.get(str(value).strip().upper(), 0.0)


def _make_bbox_wkt(lon: float, lat: float, offset: float = 0.05) -> str:
    """Create a simple bounding box polygon WKT around a centroid."""
    x1, y1 = lon - offset, lat - offset
    x2, y2 = lon + offset, lat + offset
    return (
        f"MULTIPOLYGON((("
        f"{x1} {y1}, {x2} {y1}, {x2} {y2}, {x1} {y2}, {x1} {y1}"
        f")))"
    )


async def _seed_districts(session):
    """Insert seed districts if none exist."""
    result = await session.execute(select(func.count(District.id)))
    count = result.scalar_one()
    if count > 0:
        logger.info("Districts already seeded (%d found). Skipping.", count)
        return

    logger.info("Seeding %d districts...", len(DISTRICT_DATA))
    from app.geo import storage_from_wkt

    for name, state_name, state_code, district_code, lon, lat, area in DISTRICT_DATA:
        wkt = _make_bbox_wkt(lon, lat)
        district = District(
            name=name,
            state_name=state_name,
            state_code=state_code,
            district_code=district_code,
            geometry=storage_from_wkt(wkt),
            area_sq_km=area,
            centroid_lat=lat,
            centroid_lon=lon,
        )
        session.add(district)

    await session.commit()
    logger.info("Districts seeded successfully.")


async def _load_weather_live(session) -> bool:
    """Populate weather from the live source. Returns True on success."""
    from datetime import date as _date

    from app.config import settings
    from app.services.live_data import fetch_district_weather

    if not settings.live_weather_enabled:
        return False

    districts_result = await session.execute(select(District))
    districts = list(districts_result.scalars().all())
    start, end = _date(2024, 1, 1), _date(2024, 4, 30)

    records = []
    for d in districts:
        if d.centroid_lat is None or d.centroid_lon is None:
            continue
        rows = fetch_district_weather(d.centroid_lat, d.centroid_lon, start, end)
        if not rows:
            logger.warning("Live weather unavailable for %s; falling back to CSV.", d.name)
            return False
        for r in rows:
            records.append(WeatherObservation(
                district_id=d.id,
                date=datetime.strptime(r["date"], "%Y-%m-%d").date(),
                temperature_max=r["temperature_max"], temperature_min=r["temperature_min"],
                temperature_avg=r["temperature_avg"], humidity=r["humidity"],
                rainfall_mm=r["rainfall_mm"], wind_speed=r["wind_speed"],
                wind_direction=_wind_dir_to_deg(r["wind_direction"]), pressure=r["pressure"],
                visibility=r["visibility"], cloud_cover=r["cloud_cover"],
                solar_radiation=r["solar_radiation"],
            ))

    if not records:
        return False
    session.add_all(records)
    await session.commit()
    logger.info("Loaded %d weather observations from LIVE source.", len(records))
    return True


async def _load_weather_csv(session, csv_path: str):
    """Load weather observations from the live source if enabled, else CSV."""
    result = await session.execute(select(func.count(WeatherObservation.id)))
    if result.scalar_one() > 0:
        logger.info("Weather data already exists. Skipping import.")
        return

    try:
        if await _load_weather_live(session):
            return
    except Exception as exc:  # noqa: BLE001
        logger.warning("Live weather seeding failed (%s); using sample CSV.", exc)
        await session.rollback()

    # Build district_code -> id mapping
    districts_result = await session.execute(select(District))
    districts = {d.district_code: d.id for d in districts_result.scalars().all()}

    records = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            district_id = districts.get(row.get("district_code"))
            if not district_id:
                continue
            records.append(WeatherObservation(
                district_id=district_id,
                date=datetime.strptime(row["date"], "%Y-%m-%d").date(),
                temperature_max=float(row.get("temperature_max", 0) or 0),
                temperature_min=float(row.get("temperature_min", 0) or 0),
                temperature_avg=float(row.get("temperature_avg", 0) or 0),
                humidity=float(row.get("humidity", 0) or 0),
                rainfall_mm=float(row.get("rainfall_mm", 0) or 0),
                wind_speed=float(row.get("wind_speed", 0) or 0),
                wind_direction=_wind_dir_to_deg(row.get("wind_direction")),
                pressure=float(row.get("pressure", 0) or 0),
                visibility=float(row.get("visibility", 0) or 0),
                cloud_cover=float(row.get("cloud_cover", 0) or 0),
                solar_radiation=float(row.get("solar_radiation", 0) or 0),
            ))

    session.add_all(records)
    await session.commit()
    logger.info("Loaded %d weather observations.", len(records))


async def _load_river_csv(session, csv_path: str):
    """Load river observations from a CSV file."""
    result = await session.execute(select(func.count(RiverObservation.id)))
    if result.scalar_one() > 0:
        logger.info("River data already exists. Skipping CSV import.")
        return

    districts_result = await session.execute(select(District))
    districts = {d.district_code: d.id for d in districts_result.scalars().all()}

    records = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            district_id = districts.get(row.get("district_code"))
            if not district_id:
                continue
            records.append(RiverObservation(
                district_id=district_id,
                river_name=row.get("river_name", "Unknown"),
                station_name=row.get("station_name", ""),
                date=datetime.strptime(row["date"], "%Y-%m-%d").date(),
                water_level_m=float(row.get("water_level_m", 0) or 0),
                discharge_cumecs=float(row.get("discharge_cumecs", 0) or 0),
                flood_status=row.get("flood_status", "normal"),
                danger_level_m=float(row.get("danger_level_m", 10) or 10),
                warning_level_m=float(row.get("warning_level_m", 8) or 8),
            ))

    session.add_all(records)
    await session.commit()
    logger.info("Loaded %d river observations.", len(records))


async def _load_population_csv(session, csv_path: str):
    """Load population data from a CSV file."""
    result = await session.execute(select(func.count(PopulationData.id)))
    if result.scalar_one() > 0:
        logger.info("Population data already exists. Skipping CSV import.")
        return

    districts_result = await session.execute(select(District))
    districts = {d.district_code: d.id for d in districts_result.scalars().all()}

    records = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            district_id = districts.get(row.get("district_code"))
            if not district_id:
                continue
            records.append(PopulationData(
                district_id=district_id,
                year=int(row.get("year", 2021)),
                total_population=int(row.get("total_population", 0) or 0),
                male_population=int(row.get("male_population", 0) or 0),
                female_population=int(row.get("female_population", 0) or 0),
                density_per_sq_km=float(row.get("density_per_sq_km", 0) or 0),
                urban_population=int(row.get("urban_population", 0) or 0),
                rural_population=int(row.get("rural_population", 0) or 0),
                literacy_rate=float(row.get("literacy_rate", 0) or 0),
                sex_ratio=float(row.get("sex_ratio", 0) or 0),
                growth_rate=float(row.get("growth_rate", 0) or 0),
            ))

    session.add_all(records)
    await session.commit()
    logger.info("Loaded %d population records.", len(records))


async def seed():
    """Main seed function."""
    logger.info("Starting BharatSim database seed...")

    # Drop and recreate all tables for a clean seed
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Seed districts
        await _seed_districts(session)

        # Load CSVs from data/sample/ directory
        data_dir = Path(__file__).resolve().parent.parent.parent / "data" / "sample"

        csv_loaders = [
            ("weather_sample.csv", _load_weather_csv),
            ("river_flow_sample.csv", _load_river_csv),
            ("population_sample.csv", _load_population_csv),
        ]

        for filename, loader in csv_loaders:
            csv_path = data_dir / filename
            if csv_path.exists():
                try:
                    await loader(session, str(csv_path))
                except Exception as e:
                    logger.warning("Failed to load %s: %s", filename, e)
            else:
                logger.warning("Sample CSV not found: %s", csv_path)

    logger.info("Seed completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
