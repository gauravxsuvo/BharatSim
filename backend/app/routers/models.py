"""ML model registry API routes.

Provides endpoints for listing, inspecting, and activating trained
machine learning models used by the simulation engine.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.ml_model import MLModel

router = APIRouter(tags=["ml-models"])


@router.get("/")
async def list_models(
    model_type: str | None = Query(
        None,
        description="Filter by model type (flood/heatwave/crop_yield/air_quality)",
    ),
    algorithm: str | None = Query(
        None,
        description="Filter by algorithm (xgboost/lightgbm/pytorch/sklearn)",
    ),
    active_only: bool = Query(
        False, description="Show only active models"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List all registered ML models with optional filters.

    Args:
        model_type: Filter by simulation domain.
        algorithm: Filter by ML algorithm.
        active_only: If True, return only active models.
        skip: Pagination offset.
        limit: Max records.
        db: Async database session (injected).

    Returns:
        Dictionary with list of models and total count.
    """
    query = select(MLModel)
    count_query = select(func.count(MLModel.id))

    if model_type:
        query = query.where(MLModel.model_type == model_type)
        count_query = count_query.where(MLModel.model_type == model_type)
    if algorithm:
        query = query.where(MLModel.algorithm == algorithm)
        count_query = count_query.where(MLModel.algorithm == algorithm)
    if active_only:
        query = query.where(MLModel.is_active.is_(True))
        count_query = count_query.where(MLModel.is_active.is_(True))

    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(
        query.offset(skip)
        .limit(limit)
        .order_by(MLModel.created_at.desc())
    )
    models = result.scalars().all()

    return {
        "models": [
            {
                "id": m.id,
                "model_type": m.model_type,
                "model_name": m.model_name,
                "algorithm": m.algorithm,
                "version": m.version,
                "is_active": m.is_active,
                "accuracy": m.accuracy,
                "precision_score": m.precision_score,
                "recall": m.recall,
                "f1_score": m.f1_score,
                "rmse": m.rmse,
                "mae": m.mae,
                "r2_score": m.r2_score,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
            }
            for m in models
        ],
        "total": total,
    }


@router.get("/metrics/summary")
async def get_model_metrics_summary(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get a summary of model metrics grouped by model type.

    Returns the best-performing active model for each simulation type
    along with its key metrics.

    Args:
        db: Async database session (injected).

    Returns:
        Summary of active model metrics per simulation type.
    """
    result = await db.execute(
        select(MLModel).where(MLModel.is_active.is_(True))
    )
    active_models = result.scalars().all()

    summary: dict = {}
    for m in active_models:
        summary[m.model_type] = {
            "model_name": m.model_name,
            "algorithm": m.algorithm,
            "version": m.version,
            "classification_metrics": {
                "accuracy": m.accuracy,
                "precision": m.precision_score,
                "recall": m.recall,
                "f1_score": m.f1_score,
            },
            "regression_metrics": {
                "rmse": m.rmse,
                "mae": m.mae,
                "r2_score": m.r2_score,
            },
        }

    return {"active_models": summary}


@router.get("/{model_id}")
async def get_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get detailed information about a specific ML model.

    Args:
        model_id: Primary key of the model.
        db: Async database session (injected).

    Returns:
        Full model details including hyperparameters and training info.

    Raises:
        HTTPException: 404 if model not found.
    """
    import json as json_lib

    result = await db.execute(
        select(MLModel).where(MLModel.id == model_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="ML model not found")

    hyperparams = None
    if model.hyperparameters:
        try:
            hyperparams = json_lib.loads(model.hyperparameters)
        except (json_lib.JSONDecodeError, TypeError):
            hyperparams = model.hyperparameters

    return {
        "id": model.id,
        "model_type": model.model_type,
        "model_name": model.model_name,
        "algorithm": model.algorithm,
        "version": model.version,
        "file_path": model.file_path,
        "is_active": model.is_active,
        "metrics": {
            "accuracy": model.accuracy,
            "precision_score": model.precision_score,
            "recall": model.recall,
            "f1_score": model.f1_score,
            "rmse": model.rmse,
            "mae": model.mae,
            "r2_score": model.r2_score,
        },
        "training_data_info": model.training_data_info,
        "hyperparameters": hyperparams,
        "created_at": model.created_at.isoformat() if model.created_at else None,
        "updated_at": model.updated_at.isoformat() if model.updated_at else None,
    }


@router.post("/{model_id}/activate")
async def activate_model(
    model_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Set a model as the active model for its type.

    Deactivates all other models of the same type and activates the
    specified model.

    Args:
        model_id: Primary key of the model to activate.
        db: Async database session (injected).

    Returns:
        Confirmation message with the activated model details.

    Raises:
        HTTPException: 404 if model not found.
    """
    result = await db.execute(
        select(MLModel).where(MLModel.id == model_id)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise HTTPException(status_code=404, detail="ML model not found")

    # Deactivate all models of the same type.
    await db.execute(
        update(MLModel)
        .where(MLModel.model_type == model.model_type)
        .where(MLModel.id != model_id)
        .values(is_active=False)
    )

    # Activate the selected model.
    model.is_active = True
    await db.commit()
    await db.refresh(model)

    return {
        "status": "success",
        "message": (
            f"Model '{model.model_name}' (v{model.version}) is now the "
            f"active {model.model_type} model."
        ),
        "model_id": model.id,
        "model_type": model.model_type,
        "model_name": model.model_name,
    }
