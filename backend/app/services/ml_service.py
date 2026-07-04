"""
ML Service for BharatSim.

Manages machine learning model training, prediction, and lifecycle
for environmental forecasting models including flood, heatwave,
crop yield, and air quality predictors.
"""

import logging
import os
from datetime import datetime

import pandas as pd
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.ml.flood_model import FloodPredictor
from app.ml.heatwave_model import HeatwavePredictor
from app.ml.crop_yield_model import CropYieldPredictor
from app.ml.air_quality_model import AirQualityPredictor
from app.models import (
    MLModel,
    PopulationData,
    RiverObservation,
    SatelliteData,
    WeatherObservation,
)

logger = logging.getLogger(__name__)

# Mapping of model types to their trainer classes
MODEL_TRAINERS: dict[str, type] = {
    "flood": FloodPredictor,
    "heatwave": HeatwavePredictor,
    "crop_yield": CropYieldPredictor,
    "air_quality": AirQualityPredictor,
}


async def _load_training_data(db: AsyncSession, model_type: str) -> pd.DataFrame:
    """
    Load training data from the database based on model type.

    Args:
        db: Async database session.
        model_type: Type of model determining which data to load.

    Returns:
        DataFrame containing the training data.

    Raises:
        ValueError: If no training data is found.
    """
    if model_type == "flood":
        result = await db.execute(select(RiverObservation))
        records = result.scalars().all()
        if not records:
            raise ValueError("No river observation data available for flood model training")
        df = pd.DataFrame([
            {
                "district_id": r.district_id,
                "river_name": r.river_name,
                "date": r.date,
                "water_level_m": r.water_level_m,
                "discharge_cumecs": r.discharge_cumecs,
                "flood_status": r.flood_status,
                "danger_level_m": r.danger_level_m,
            }
            for r in records
        ])
        # Enrich with weather data
        weather_result = await db.execute(select(WeatherObservation))
        weather_records = weather_result.scalars().all()
        if weather_records:
            weather_df = pd.DataFrame([
                {
                    "district_id": w.district_id,
                    "date": w.date,
                    "rainfall_mm": w.rainfall_mm,
                    "humidity": w.humidity,
                    "temperature_avg": w.temperature_avg,
                }
                for w in weather_records
            ])
            df = df.merge(weather_df, on=["district_id", "date"], how="left")
        return df

    elif model_type == "heatwave":
        result = await db.execute(select(WeatherObservation))
        records = result.scalars().all()
        if not records:
            raise ValueError("No weather data available for heatwave model training")
        return pd.DataFrame([
            {
                "district_id": r.district_id,
                "date": r.date,
                "temperature_max": r.temperature_max,
                "temperature_min": r.temperature_min,
                "temperature_avg": r.temperature_avg,
                "humidity": r.humidity,
                "wind_speed": r.wind_speed,
                "pressure": r.pressure,
            }
            for r in records
        ])

    elif model_type == "crop_yield":
        # Combine satellite, weather, and population data
        sat_result = await db.execute(select(SatelliteData))
        sat_records = sat_result.scalars().all()
        if not sat_records:
            raise ValueError("No satellite data available for crop yield model training")
        df = pd.DataFrame([
            {
                "district_id": s.district_id,
                "acquisition_date": s.acquisition_date,
                "ndvi_mean": s.ndvi_mean,
                "ndvi_min": s.ndvi_min,
                "ndvi_max": s.ndvi_max,
            }
            for s in sat_records
        ])
        # Enrich with weather data
        weather_result = await db.execute(select(WeatherObservation))
        weather_records = weather_result.scalars().all()
        if weather_records:
            weather_df = pd.DataFrame([
                {
                    "district_id": w.district_id,
                    "date": w.date,
                    "rainfall_mm": w.rainfall_mm,
                    "temperature_avg": w.temperature_avg,
                    "humidity": w.humidity,
                }
                for w in weather_records
            ])
            df = df.merge(
                weather_df,
                left_on=["district_id", "acquisition_date"],
                right_on=["district_id", "date"],
                how="left",
            )
        return df

    elif model_type == "air_quality":
        result = await db.execute(select(WeatherObservation))
        records = result.scalars().all()
        if not records:
            raise ValueError("No weather data available for air quality model training")
        return pd.DataFrame([
            {
                "district_id": r.district_id,
                "date": r.date,
                "temperature_avg": r.temperature_avg,
                "humidity": r.humidity,
                "wind_speed": r.wind_speed,
                "pressure": r.pressure,
            }
            for r in records
        ])

    else:
        raise ValueError(f"Unknown model type: {model_type}")


async def train_model(
    db: AsyncSession,
    model_type: str,
    algorithm: str,
    hyperparameters: dict | None = None,
) -> dict:
    """
    Train a machine learning model.

    Loads training data from the database, trains the model using the
    specified algorithm, saves the model file, and creates a database record.

    Args:
        db: Async database session.
        model_type: Type of model (flood, heatwave, crop_yield, air_quality).
        algorithm: ML algorithm to use (e.g., random_forest, xgboost).
        hyperparameters: Optional model hyperparameters.

    Returns:
        Dictionary containing model metadata and performance metrics.

    Raises:
        ValueError: If model_type is not recognized.
        Exception: On training or database errors.
    """
    if model_type not in MODEL_TRAINERS:
        raise ValueError(
            f"Unknown model type: {model_type}. "
            f"Must be one of: {list(MODEL_TRAINERS.keys())}"
        )

    logger.info(
        "Training %s model with algorithm=%s, hyperparameters=%s",
        model_type, algorithm, hyperparameters,
    )

    try:
        # Load training data
        training_data = await _load_training_data(db, model_type)
        logger.info("Loaded %d training records for %s", len(training_data), model_type)

        # Instantiate trainer
        trainer_class = MODEL_TRAINERS[model_type]
        trainer = trainer_class(
            algorithm=algorithm,
            hyperparameters=hyperparameters or {},
        )

        # Prepare features and train
        X, y = trainer.prepare_features(training_data)
        metrics = trainer.train(X, y)

        # Save model file
        models_dir = os.path.join(settings.ML_MODELS_DIR, model_type)
        os.makedirs(models_dir, exist_ok=True)

        version = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        model_filename = f"{model_type}_{algorithm}_{version}.joblib"
        model_path = os.path.join(models_dir, model_filename)
        trainer.save(model_path)

        # Deactivate previous active models of the same type
        existing_models = await db.execute(
            select(MLModel).where(
                MLModel.model_type == model_type,
                MLModel.is_active == True,  # noqa: E712
            )
        )
        for existing in existing_models.scalars().all():
            existing.is_active = False

        # Create model record
        ml_model = MLModel(
            model_type=model_type,
            model_name=f"{model_type}_{algorithm}",
            algorithm=algorithm,
            version=version,
            file_path=model_path,
            accuracy=metrics.get("accuracy"),
            precision_score=metrics.get("precision"),
            recall=metrics.get("recall"),
            f1_score=metrics.get("f1"),
            rmse=metrics.get("rmse"),
            mae=metrics.get("mae"),
            r2_score=metrics.get("r2"),
            is_active=True,
            created_at=datetime.utcnow(),
        )

        db.add(ml_model)
        await db.commit()
        await db.refresh(ml_model)

        logger.info(
            "Model trained and saved: id=%d, type=%s, version=%s",
            ml_model.id, model_type, version,
        )

        return {
            "model_id": ml_model.id,
            "model_type": model_type,
            "model_name": ml_model.model_name,
            "algorithm": algorithm,
            "version": version,
            "file_path": model_path,
            "metrics": {
                "accuracy": metrics.get("accuracy"),
                "precision": metrics.get("precision"),
                "recall": metrics.get("recall"),
                "f1": metrics.get("f1"),
                "rmse": metrics.get("rmse"),
                "mae": metrics.get("mae"),
                "r2": metrics.get("r2"),
            },
            "is_active": True,
            "created_at": ml_model.created_at.isoformat(),
        }

    except Exception as e:
        await db.rollback()
        logger.error("Failed to train %s model: %s", model_type, str(e))
        raise


async def get_prediction(
    db: AsyncSession,
    model_type: str,
    features: dict,
) -> dict:
    """
    Generate a prediction using the active model.

    Loads the currently active model for the specified type and
    generates predictions based on the provided features.

    Args:
        db: Async database session.
        model_type: Type of model to use for prediction.
        features: Dictionary of input features for prediction.

    Returns:
        Dictionary containing prediction results and model metadata.

    Raises:
        HTTPException: 404 if no active model found.
        ValueError: If model_type is not recognized.
    """
    if model_type not in MODEL_TRAINERS:
        raise ValueError(
            f"Unknown model type: {model_type}. "
            f"Must be one of: {list(MODEL_TRAINERS.keys())}"
        )

    # Find active model
    result = await db.execute(
        select(MLModel).where(
            MLModel.model_type == model_type,
            MLModel.is_active == True,  # noqa: E712
        )
    )
    active_model = result.scalar_one_or_none()

    if not active_model:
        raise HTTPException(
            status_code=404,
            detail=f"No active {model_type} model found. Train a model first.",
        )

    logger.info(
        "Loading model for prediction: type=%s, model_id=%d, version=%s",
        model_type, active_model.id, active_model.version,
    )

    # Load model and predict
    trainer_class = MODEL_TRAINERS[model_type]
    trainer = trainer_class(algorithm=active_model.algorithm)
    trainer.load(active_model.file_path)

    prediction = trainer.predict(features)

    return {
        "model_type": model_type,
        "model_id": active_model.id,
        "model_name": active_model.model_name,
        "version": active_model.version,
        "prediction": prediction,
        "features_used": features,
    }


async def list_models(
    db: AsyncSession,
    model_type: str | None = None,
) -> list[dict]:
    """
    List all ML models, optionally filtered by type.

    Args:
        db: Async database session.
        model_type: Optional filter for model type.

    Returns:
        List of dictionaries containing model metadata and metrics.
    """
    query = select(MLModel)
    if model_type:
        query = query.where(MLModel.model_type == model_type)

    query = query.order_by(MLModel.created_at.desc())

    result = await db.execute(query)
    models = result.scalars().all()

    logger.info(
        "Listed %d models (filter: %s)",
        len(models), model_type or "all",
    )

    return [
        {
            "id": m.id,
            "model_type": m.model_type,
            "model_name": m.model_name,
            "algorithm": m.algorithm,
            "version": m.version,
            "file_path": m.file_path,
            "metrics": {
                "accuracy": m.accuracy,
                "precision": m.precision_score,
                "recall": m.recall,
                "f1": m.f1_score,
                "rmse": m.rmse,
                "mae": m.mae,
                "r2": m.r2_score,
            },
            "is_active": m.is_active,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in models
    ]
