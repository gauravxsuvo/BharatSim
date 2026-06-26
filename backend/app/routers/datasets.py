"""Dataset upload and summary API routes.

Provides endpoints for uploading CSV datasets (weather, river, population,
satellite) and retrieving summary statistics for available data.
"""

import csv
import io
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.population import PopulationData
from app.models.river import RiverObservation
from app.models.satellite import SatelliteData
from app.models.weather import WeatherObservation

router = APIRouter(tags=["datasets"])

VALID_DATASET_TYPES = {"weather", "river", "population", "satellite"}


def _parse_float(value: str | None) -> float | None:
    """Safely parse a string to float, returning None on failure."""
    if value is None or value.strip() == "":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _parse_int(value: str | None) -> int | None:
    """Safely parse a string to int, returning None on failure."""
    if value is None or value.strip() == "":
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def _parse_date(value: str | None) -> date_type | None:
    """Parse a date string in YYYY-MM-DD format."""
    if value is None or value.strip() == "":
        return None
    try:
        return date_type.fromisoformat(value.strip())
    except ValueError:
        return None


async def _process_weather_csv(
    reader: csv.DictReader, db: AsyncSession
) -> int:
    """Parse weather CSV rows and bulk-insert into the database.

    Expected columns: district_id, date, temperature_max, temperature_min,
    temperature_avg, humidity, rainfall_mm, wind_speed, wind_direction,
    pressure, visibility, cloud_cover, solar_radiation.

    Returns:
        Number of records inserted.
    """
    records: list[WeatherObservation] = []
    for row in reader:
        obs = WeatherObservation(
            district_id=int(row["district_id"]),
            date=_parse_date(row["date"]),
            temperature_max=_parse_float(row.get("temperature_max")),
            temperature_min=_parse_float(row.get("temperature_min")),
            temperature_avg=_parse_float(row.get("temperature_avg")),
            humidity=_parse_float(row.get("humidity")),
            rainfall_mm=_parse_float(row.get("rainfall_mm")),
            wind_speed=_parse_float(row.get("wind_speed")),
            wind_direction=_parse_float(row.get("wind_direction")),
            pressure=_parse_float(row.get("pressure")),
            visibility=_parse_float(row.get("visibility")),
            cloud_cover=_parse_float(row.get("cloud_cover")),
            solar_radiation=_parse_float(row.get("solar_radiation")),
        )
        records.append(obs)
    db.add_all(records)
    await db.commit()
    return len(records)


async def _process_river_csv(
    reader: csv.DictReader, db: AsyncSession
) -> int:
    """Parse river observation CSV rows and bulk-insert.

    Expected columns: district_id, river_name, station_name, date,
    water_level_m, discharge_cumecs, flood_status, danger_level_m,
    warning_level_m.
    """
    records: list[RiverObservation] = []
    for row in reader:
        obs = RiverObservation(
            district_id=int(row["district_id"]),
            river_name=row["river_name"],
            station_name=row.get("station_name"),
            date=_parse_date(row["date"]),
            water_level_m=_parse_float(row.get("water_level_m")),
            discharge_cumecs=_parse_float(row.get("discharge_cumecs")),
            flood_status=row.get("flood_status", "normal"),
            danger_level_m=_parse_float(row.get("danger_level_m")),
            warning_level_m=_parse_float(row.get("warning_level_m")),
        )
        records.append(obs)
    db.add_all(records)
    await db.commit()
    return len(records)


async def _process_population_csv(
    reader: csv.DictReader, db: AsyncSession
) -> int:
    """Parse population CSV rows and bulk-insert.

    Expected columns: district_id, year, total_population, male_population,
    female_population, density_per_sq_km, urban_population, rural_population,
    literacy_rate, sex_ratio, growth_rate.
    """
    records: list[PopulationData] = []
    for row in reader:
        rec = PopulationData(
            district_id=int(row["district_id"]),
            year=int(row["year"]),
            total_population=_parse_int(row.get("total_population")),
            male_population=_parse_int(row.get("male_population")),
            female_population=_parse_int(row.get("female_population")),
            density_per_sq_km=_parse_float(row.get("density_per_sq_km")),
            urban_population=_parse_int(row.get("urban_population")),
            rural_population=_parse_int(row.get("rural_population")),
            literacy_rate=_parse_float(row.get("literacy_rate")),
            sex_ratio=_parse_float(row.get("sex_ratio")),
            growth_rate=_parse_float(row.get("growth_rate")),
        )
        records.append(rec)
    db.add_all(records)
    await db.commit()
    return len(records)


async def _process_satellite_csv(
    reader: csv.DictReader, db: AsyncSession
) -> int:
    """Parse satellite data CSV rows and bulk-insert.

    Expected columns: district_id (optional), satellite_name,
    acquisition_date, band_info, resolution_m, cloud_cover_pct,
    ndvi_mean, ndvi_min, ndvi_max, file_path, metadata_json.
    """
    records: list[SatelliteData] = []
    for row in reader:
        rec = SatelliteData(
            district_id=_parse_int(row.get("district_id")),
            satellite_name=row["satellite_name"],
            acquisition_date=_parse_date(row["acquisition_date"]),
            band_info=row.get("band_info"),
            resolution_m=_parse_float(row.get("resolution_m")),
            cloud_cover_pct=_parse_float(row.get("cloud_cover_pct")),
            ndvi_mean=_parse_float(row.get("ndvi_mean")),
            ndvi_min=_parse_float(row.get("ndvi_min")),
            ndvi_max=_parse_float(row.get("ndvi_max")),
            file_path=row.get("file_path"),
            metadata_json=row.get("metadata_json"),
        )
        records.append(rec)
    db.add_all(records)
    await db.commit()
    return len(records)


_PROCESSORS = {
    "weather": _process_weather_csv,
    "river": _process_river_csv,
    "population": _process_population_csv,
    "satellite": _process_satellite_csv,
}


@router.post("/upload")
async def upload_dataset(
    file: UploadFile,
    dataset_type: str = Query(
        ...,
        description="Dataset type: weather, river, population, satellite",
    ),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Upload a CSV dataset and store its contents in the database.

    Supported dataset types: weather, river, population, satellite.
    The CSV must have a header row matching the expected column names.

    Args:
        file: Uploaded CSV file.
        dataset_type: One of the supported dataset types.
        db: Async database session (injected).

    Returns:
        Status message with number of records inserted.

    Raises:
        HTTPException: 400 if dataset_type is invalid or CSV parsing fails.
    """
    if dataset_type not in VALID_DATASET_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid dataset_type '{dataset_type}'. "
                f"Must be one of: {', '.join(sorted(VALID_DATASET_TYPES))}"
            ),
        )

    try:
        contents = await file.read()
        text = contents.decode("utf-8")
        reader = csv.DictReader(io.StringIO(text))

        processor = _PROCESSORS[dataset_type]
        count = await processor(reader, db)

        return {
            "status": "success",
            "dataset_type": dataset_type,
            "records_inserted": count,
            "filename": file.filename,
        }
    except KeyError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required column in CSV: {exc}",
        ) from exc
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse CSV: {exc}",
        ) from exc


@router.get("/summary")
async def get_dataset_summary(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return summary statistics for all available dataset types.

    Returns:
        Dictionary with record counts per dataset type and date ranges.
    """
    weather_count = (
        await db.execute(select(func.count(WeatherObservation.id)))
    ).scalar_one()
    weather_date_range = (
        await db.execute(
            select(
                func.min(WeatherObservation.date),
                func.max(WeatherObservation.date),
            )
        )
    ).one()

    river_count = (
        await db.execute(select(func.count(RiverObservation.id)))
    ).scalar_one()
    river_date_range = (
        await db.execute(
            select(
                func.min(RiverObservation.date),
                func.max(RiverObservation.date),
            )
        )
    ).one()

    population_count = (
        await db.execute(select(func.count(PopulationData.id)))
    ).scalar_one()
    population_year_range = (
        await db.execute(
            select(
                func.min(PopulationData.year),
                func.max(PopulationData.year),
            )
        )
    ).one()

    satellite_count = (
        await db.execute(select(func.count(SatelliteData.id)))
    ).scalar_one()
    satellite_date_range = (
        await db.execute(
            select(
                func.min(SatelliteData.acquisition_date),
                func.max(SatelliteData.acquisition_date),
            )
        )
    ).one()

    return {
        "weather": {
            "total_records": weather_count,
            "date_range_start": str(weather_date_range[0]) if weather_date_range[0] else None,
            "date_range_end": str(weather_date_range[1]) if weather_date_range[1] else None,
        },
        "river": {
            "total_records": river_count,
            "date_range_start": str(river_date_range[0]) if river_date_range[0] else None,
            "date_range_end": str(river_date_range[1]) if river_date_range[1] else None,
        },
        "population": {
            "total_records": population_count,
            "year_range_start": population_year_range[0],
            "year_range_end": population_year_range[1],
        },
        "satellite": {
            "total_records": satellite_count,
            "date_range_start": str(satellite_date_range[0]) if satellite_date_range[0] else None,
            "date_range_end": str(satellite_date_range[1]) if satellite_date_range[1] else None,
        },
    }
