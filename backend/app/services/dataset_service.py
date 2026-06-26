"""
Dataset Service for BharatSim.

Handles importing and managing environmental datasets including
weather, river, population, and satellite data.
"""

import io
import logging
from datetime import date as date_type

import pandas as pd
from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    District,
    PopulationData,
    RiverObservation,
    SatelliteData,
    WeatherObservation,
)

logger = logging.getLogger(__name__)


async def import_weather_data(db: AsyncSession, file: UploadFile) -> int:
    """
    Import weather observation data from a CSV file.

    Expected CSV columns: district_id, date, temperature_max, temperature_min,
    temperature_avg, humidity, rainfall_mm, wind_speed, pressure, aqi,
    weather_condition.

    Args:
        db: Async database session.
        file: Uploaded CSV file.

    Returns:
        Number of records imported.

    Raises:
        ValueError: If required columns are missing.
        Exception: On database or parsing errors.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        required_columns = [
            "district_id", "date", "temperature_max", "temperature_min",
            "temperature_avg", "humidity", "rainfall_mm", "wind_speed",
            "pressure", "aqi", "weather_condition",
        ]
        missing = set(required_columns) - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        df["date"] = pd.to_datetime(df["date"]).dt.date

        observations = [
            WeatherObservation(
                district_id=int(row["district_id"]),
                date=row["date"],
                temperature_max=float(row["temperature_max"]) if pd.notna(row["temperature_max"]) else None,
                temperature_min=float(row["temperature_min"]) if pd.notna(row["temperature_min"]) else None,
                temperature_avg=float(row["temperature_avg"]) if pd.notna(row["temperature_avg"]) else None,
                humidity=float(row["humidity"]) if pd.notna(row["humidity"]) else None,
                rainfall_mm=float(row["rainfall_mm"]) if pd.notna(row["rainfall_mm"]) else None,
                wind_speed=float(row["wind_speed"]) if pd.notna(row["wind_speed"]) else None,
                pressure=float(row["pressure"]) if pd.notna(row["pressure"]) else None,
                aqi=float(row["aqi"]) if pd.notna(row["aqi"]) else None,
                weather_condition=str(row["weather_condition"]) if pd.notna(row["weather_condition"]) else None,
            )
            for _, row in df.iterrows()
        ]

        db.add_all(observations)
        await db.commit()

        logger.info("Imported %d weather observations", len(observations))
        return len(observations)

    except Exception as e:
        await db.rollback()
        logger.error("Failed to import weather data: %s", str(e))
        raise


async def import_river_data(db: AsyncSession, file: UploadFile) -> int:
    """
    Import river observation data from a CSV file.

    Expected CSV columns: district_id, river_name, date, water_level_m,
    discharge_cumecs, flood_status, danger_level_m.

    Args:
        db: Async database session.
        file: Uploaded CSV file.

    Returns:
        Number of records imported.

    Raises:
        ValueError: If required columns are missing.
        Exception: On database or parsing errors.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        required_columns = [
            "district_id", "river_name", "date", "water_level_m",
            "discharge_cumecs", "flood_status", "danger_level_m",
        ]
        missing = set(required_columns) - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        df["date"] = pd.to_datetime(df["date"]).dt.date

        observations = [
            RiverObservation(
                district_id=int(row["district_id"]),
                river_name=str(row["river_name"]),
                date=row["date"],
                water_level_m=float(row["water_level_m"]) if pd.notna(row["water_level_m"]) else None,
                discharge_cumecs=float(row["discharge_cumecs"]) if pd.notna(row["discharge_cumecs"]) else None,
                flood_status=str(row["flood_status"]) if pd.notna(row["flood_status"]) else None,
                danger_level_m=float(row["danger_level_m"]) if pd.notna(row["danger_level_m"]) else None,
            )
            for _, row in df.iterrows()
        ]

        db.add_all(observations)
        await db.commit()

        logger.info("Imported %d river observations", len(observations))
        return len(observations)

    except Exception as e:
        await db.rollback()
        logger.error("Failed to import river data: %s", str(e))
        raise


async def import_population_data(db: AsyncSession, file: UploadFile) -> int:
    """
    Import population data from a CSV file.

    Expected CSV columns: district_id, year, total_population, density_per_sq_km,
    urban_population, rural_population, literacy_rate.

    Args:
        db: Async database session.
        file: Uploaded CSV file.

    Returns:
        Number of records imported.

    Raises:
        ValueError: If required columns are missing.
        Exception: On database or parsing errors.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        required_columns = [
            "district_id", "year", "total_population", "density_per_sq_km",
            "urban_population", "rural_population", "literacy_rate",
        ]
        missing = set(required_columns) - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        records = [
            PopulationData(
                district_id=int(row["district_id"]),
                year=int(row["year"]),
                total_population=int(row["total_population"]) if pd.notna(row["total_population"]) else None,
                density_per_sq_km=float(row["density_per_sq_km"]) if pd.notna(row["density_per_sq_km"]) else None,
                urban_population=int(row["urban_population"]) if pd.notna(row["urban_population"]) else None,
                rural_population=int(row["rural_population"]) if pd.notna(row["rural_population"]) else None,
                literacy_rate=float(row["literacy_rate"]) if pd.notna(row["literacy_rate"]) else None,
            )
            for _, row in df.iterrows()
        ]

        db.add_all(records)
        await db.commit()

        logger.info("Imported %d population records", len(records))
        return len(records)

    except Exception as e:
        await db.rollback()
        logger.error("Failed to import population data: %s", str(e))
        raise


async def import_satellite_data(db: AsyncSession, file: UploadFile) -> int:
    """
    Import satellite data from a CSV file.

    Expected CSV columns: district_id, satellite_name, acquisition_date,
    ndvi_mean, ndvi_min, ndvi_max, file_path.

    Args:
        db: Async database session.
        file: Uploaded CSV file.

    Returns:
        Number of records imported.

    Raises:
        ValueError: If required columns are missing.
        Exception: On database or parsing errors.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        required_columns = [
            "district_id", "satellite_name", "acquisition_date",
            "ndvi_mean", "ndvi_min", "ndvi_max", "file_path",
        ]
        missing = set(required_columns) - set(df.columns)
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        df["acquisition_date"] = pd.to_datetime(df["acquisition_date"]).dt.date

        records = [
            SatelliteData(
                district_id=int(row["district_id"]),
                satellite_name=str(row["satellite_name"]),
                acquisition_date=row["acquisition_date"],
                ndvi_mean=float(row["ndvi_mean"]) if pd.notna(row["ndvi_mean"]) else None,
                ndvi_min=float(row["ndvi_min"]) if pd.notna(row["ndvi_min"]) else None,
                ndvi_max=float(row["ndvi_max"]) if pd.notna(row["ndvi_max"]) else None,
                file_path=str(row["file_path"]) if pd.notna(row["file_path"]) else None,
            )
            for _, row in df.iterrows()
        ]

        db.add_all(records)
        await db.commit()

        logger.info("Imported %d satellite records", len(records))
        return len(records)

    except Exception as e:
        await db.rollback()
        logger.error("Failed to import satellite data: %s", str(e))
        raise


async def get_dataset_summary(db: AsyncSession, dataset_type: str) -> dict:
    """
    Get a summary of a specific dataset type.

    Args:
        db: Async database session.
        dataset_type: One of 'weather', 'river', 'population', 'satellite'.

    Returns:
        Dictionary with total_records, date_range (min/max), and
        districts_covered count.

    Raises:
        ValueError: If dataset_type is not recognized.
    """
    type_mapping = {
        "weather": {
            "model": WeatherObservation,
            "date_col": WeatherObservation.date,
        },
        "river": {
            "model": RiverObservation,
            "date_col": RiverObservation.date,
        },
        "population": {
            "model": PopulationData,
            "date_col": None,  # Uses year instead of date
        },
        "satellite": {
            "model": SatelliteData,
            "date_col": SatelliteData.acquisition_date,
        },
    }

    if dataset_type not in type_mapping:
        raise ValueError(
            f"Unknown dataset type: {dataset_type}. "
            f"Must be one of: {list(type_mapping.keys())}"
        )

    config = type_mapping[dataset_type]
    model = config["model"]
    date_col = config["date_col"]

    # Total records
    count_result = await db.execute(select(func.count(model.id)))
    total_records = count_result.scalar() or 0

    # Districts covered
    district_result = await db.execute(
        select(func.count(func.distinct(model.district_id)))
    )
    districts_covered = district_result.scalar() or 0

    # Date range
    date_range = {"min": None, "max": None}
    if date_col is not None:
        min_result = await db.execute(select(func.min(date_col)))
        max_result = await db.execute(select(func.max(date_col)))
        min_date = min_result.scalar()
        max_date = max_result.scalar()
        date_range = {
            "min": str(min_date) if min_date else None,
            "max": str(max_date) if max_date else None,
        }
    elif dataset_type == "population":
        min_result = await db.execute(select(func.min(PopulationData.year)))
        max_result = await db.execute(select(func.max(PopulationData.year)))
        min_year = min_result.scalar()
        max_year = max_result.scalar()
        date_range = {
            "min": str(min_year) if min_year else None,
            "max": str(max_year) if max_year else None,
        }

    logger.info(
        "Dataset summary for '%s': %d records, %d districts",
        dataset_type, total_records, districts_covered,
    )

    return {
        "total_records": total_records,
        "date_range": date_range,
        "districts_covered": districts_covered,
    }
