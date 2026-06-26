"""Simulation management API routes.

Provides endpoints for creating, listing, comparing, and deleting
environmental simulation runs (flood, heatwave, crop yield, air quality).
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.simulation import SimulationResult, SimulationRun
from app.schemas.simulation import (
    SimulationCompareRequest,
    SimulationParams,
    SimulationResponse,
    SimulationResultResponse,
)

router = APIRouter(tags=["simulations"])


def _serialize_simulation(run: SimulationRun) -> SimulationResponse:
    """Convert a SimulationRun ORM object to a response schema."""
    params = run.get_parameters() if run.parameters else None
    results = [
        SimulationResultResponse.model_validate(r) for r in run.results
    ]
    return SimulationResponse(
        id=run.id,
        simulation_type=run.simulation_type,
        name=run.name,
        description=run.description,
        status=run.status,
        parameters=params,
        created_at=run.created_at,
        completed_at=run.completed_at,
        results=results,
    )


@router.post("/", response_model=SimulationResponse, status_code=201)
async def create_simulation(
    params: SimulationParams,
    db: AsyncSession = Depends(get_db),
) -> SimulationResponse:
    """Create a new simulation run.

    The simulation is created with status "pending" and can be picked up
    by a background worker (Celery) for execution.

    Args:
        params: Simulation creation parameters.
        db: Async database session (injected).

    Returns:
        The newly created simulation run.
    """
    run = SimulationRun(
        simulation_type=params.simulation_type,
        name=params.name,
        description=params.description,
        status="pending",
        date_range_start=params.date_range_start,
        date_range_end=params.date_range_end,
    )
    run.set_parameters(params.parameters)
    run.set_district_ids(params.district_ids)

    db.add(run)
    await db.commit()
    await db.refresh(run)

    return _serialize_simulation(run)


@router.get("/", response_model=list[SimulationResponse])
async def list_simulations(
    status: str | None = Query(
        None, description="Filter by status (pending/running/completed/failed)"
    ),
    simulation_type: str | None = Query(
        None, description="Filter by type (flood/heatwave/crop_yield/air_quality)"
    ),
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records"),
    db: AsyncSession = Depends(get_db),
) -> list[SimulationResponse]:
    """List simulation runs with optional filtering.

    Args:
        status: Filter by execution status.
        simulation_type: Filter by simulation type.
        skip: Pagination offset.
        limit: Maximum records to return.
        db: Async database session (injected).

    Returns:
        List of simulation run summaries.
    """
    query = (
        select(SimulationRun)
        .options(selectinload(SimulationRun.results))
        .order_by(SimulationRun.created_at.desc())
    )

    if status:
        query = query.where(SimulationRun.status == status)
    if simulation_type:
        query = query.where(
            SimulationRun.simulation_type == simulation_type
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    runs = result.scalars().unique().all()

    return [_serialize_simulation(r) for r in runs]


@router.get("/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(
    simulation_id: int,
    db: AsyncSession = Depends(get_db),
) -> SimulationResponse:
    """Get detailed information about a simulation run including results.

    Args:
        simulation_id: Primary key of the simulation run.
        db: Async database session (injected).

    Returns:
        Simulation run details with all result metrics.

    Raises:
        HTTPException: 404 if simulation not found.
    """
    result = await db.execute(
        select(SimulationRun)
        .options(selectinload(SimulationRun.results))
        .where(SimulationRun.id == simulation_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=404, detail="Simulation run not found"
        )

    return _serialize_simulation(run)


@router.post("/compare")
async def compare_simulations(
    request: SimulationCompareRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Compare multiple simulation runs side by side.

    Fetches all requested simulation runs and organises their results
    for comparison across shared districts and metrics.

    Args:
        request: List of simulation IDs to compare.
        db: Async database session (injected).

    Returns:
        Comparison data structure with simulation metadata and results.

    Raises:
        HTTPException: 404 if any simulation ID is not found.
    """
    result = await db.execute(
        select(SimulationRun)
        .options(selectinload(SimulationRun.results))
        .where(SimulationRun.id.in_(request.simulation_ids))
    )
    runs = result.scalars().unique().all()

    found_ids = {r.id for r in runs}
    missing_ids = set(request.simulation_ids) - found_ids
    if missing_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Simulation run(s) not found: {sorted(missing_ids)}",
        )

    comparison: dict = {
        "simulations": [],
        "metrics": set(),
        "districts": set(),
    }

    for run in runs:
        sim_data = {
            "id": run.id,
            "name": run.name,
            "simulation_type": run.simulation_type,
            "status": run.status,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "results": [],
        }
        for res in run.results:
            comparison["metrics"].add(res.metric_name)
            comparison["districts"].add(res.district_id)
            sim_data["results"].append(
                {
                    "district_id": res.district_id,
                    "metric_name": res.metric_name,
                    "metric_value": res.metric_value,
                    "metric_unit": res.metric_unit,
                    "confidence": res.confidence,
                    "severity_level": res.severity_level,
                }
            )
        comparison["simulations"].append(sim_data)

    # Convert sets to sorted lists for JSON serialisation.
    comparison["metrics"] = sorted(comparison["metrics"])
    comparison["districts"] = sorted(comparison["districts"])

    return comparison


@router.delete("/{simulation_id}", status_code=204)
async def delete_simulation(
    simulation_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a simulation run and all its results.

    Args:
        simulation_id: Primary key of the simulation run.
        db: Async database session (injected).

    Raises:
        HTTPException: 404 if simulation not found.
    """
    result = await db.execute(
        select(SimulationRun).where(SimulationRun.id == simulation_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(
            status_code=404, detail="Simulation run not found"
        )

    await db.delete(run)
    await db.commit()
