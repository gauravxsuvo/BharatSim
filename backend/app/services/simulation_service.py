"""
Simulation Service for BharatSim.

Manages the lifecycle of environmental simulations including creation,
execution, result storage, and comparison of simulation runs.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import SimulationResult as SimulationResultModel, SimulationRun
from app.schemas.simulation import SimulationParams
from app.simulation.runner import SimulationRunner

logger = logging.getLogger(__name__)


async def run_simulation(db: AsyncSession, params: SimulationParams) -> dict:
    """
    Create and execute a simulation run.

    Creates a SimulationRun record, executes the simulation via
    SimulationRunner, stores results, and updates the run status.

    Args:
        db: Async database session.
        params: Simulation parameters including type, district IDs,
                date range, and model-specific parameters.

    Returns:
        Dictionary containing simulation_id, status, and results summary.

    Raises:
        Exception: On simulation execution or database errors.
    """
    simulation_run = SimulationRun(
        simulation_type=params.simulation_type,
        name=params.name,
        description=params.description,
        parameters=json.dumps(params.parameters) if params.parameters else "{}",
        status="running",
        district_ids=json.dumps(params.district_ids) if params.district_ids else "[]",
        date_range_start=params.date_range_start,
        date_range_end=params.date_range_end,
        created_at=datetime.now(timezone.utc),
    )

    try:
        db.add(simulation_run)
        await db.flush()

        logger.info(
            "Starting simulation run %d: type=%s, districts=%s",
            simulation_run.id, params.simulation_type, params.district_ids,
        )

        # Execute simulation
        runner = SimulationRunner()
        results = await runner.run(
            db=db,
            simulation_type=params.simulation_type,
            district_ids=params.district_ids or [],
            date_range=(params.date_range_start, params.date_range_end),
            params=params.parameters or {},
        )

        # Store simulation results
        result_records = []
        for result in results.district_results:
            result_record = SimulationResultModel(
                simulation_run_id=simulation_run.id,
                district_id=result.get("district_id"),
                metric_name=result.get("metric_name"),
                metric_value=result.get("metric_value"),
                metric_unit=result.get("metric_unit"),
                confidence=result.get("confidence"),
                severity_level=result.get("severity_level"),
                geojson_data=json.dumps(result["geojson_data"]) if result.get("geojson_data") else None,
            )
            result_records.append(result_record)

        if result_records:
            db.add_all(result_records)

        # Update run status
        simulation_run.status = "completed"
        simulation_run.completed_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(
            "Simulation run %d completed with %d results",
            simulation_run.id, len(result_records),
        )

        return {
            "simulation_id": simulation_run.id,
            "status": "completed",
            "results_count": len(result_records),
            "simulation_type": params.simulation_type,
            "name": params.name,
            "created_at": simulation_run.created_at.isoformat(),
            "completed_at": simulation_run.completed_at.isoformat(),
        }

    except Exception as e:
        simulation_run.status = "failed"
        simulation_run.completed_at = datetime.now(timezone.utc)
        await db.commit()
        logger.error("Simulation run %d failed: %s", simulation_run.id, str(e))
        raise


async def get_simulation_results(db: AsyncSession, simulation_id: int) -> dict:
    """
    Retrieve results for a specific simulation run.

    Args:
        db: Async database session.
        simulation_id: ID of the simulation run to retrieve.

    Returns:
        Dictionary containing run metadata and associated results.

    Raises:
        HTTPException: 404 if simulation run not found.
    """
    # Fetch simulation run
    result = await db.execute(
        select(SimulationRun).where(SimulationRun.id == simulation_id)
    )
    simulation_run = result.scalar_one_or_none()

    if not simulation_run:
        raise HTTPException(
            status_code=404,
            detail=f"Simulation run with id {simulation_id} not found",
        )

    # Fetch associated results
    results_query = await db.execute(
        select(SimulationResultModel).where(
            SimulationResultModel.simulation_run_id == simulation_id
        )
    )
    results = results_query.scalars().all()

    logger.info(
        "Retrieved %d results for simulation run %d",
        len(results), simulation_id,
    )

    return {
        "simulation_id": simulation_run.id,
        "simulation_type": simulation_run.simulation_type,
        "name": simulation_run.name,
        "description": simulation_run.description,
        "status": simulation_run.status,
        "parameters": json.loads(simulation_run.parameters) if simulation_run.parameters else {},
        "district_ids": json.loads(simulation_run.district_ids) if simulation_run.district_ids else [],
        "date_range_start": str(simulation_run.date_range_start) if simulation_run.date_range_start else None,
        "date_range_end": str(simulation_run.date_range_end) if simulation_run.date_range_end else None,
        "created_at": simulation_run.created_at.isoformat() if simulation_run.created_at else None,
        "completed_at": simulation_run.completed_at.isoformat() if simulation_run.completed_at else None,
        "results": [
            {
                "id": r.id,
                "district_id": r.district_id,
                "metric_name": r.metric_name,
                "metric_value": r.metric_value,
                "metric_unit": r.metric_unit,
                "confidence": r.confidence,
                "severity_level": r.severity_level,
                "geojson_data": json.loads(r.geojson_data) if r.geojson_data else None,
            }
            for r in results
        ],
    }


async def compare_simulations(
    db: AsyncSession, simulation_ids: list[int]
) -> dict:
    """
    Compare results across multiple simulation runs.

    Args:
        db: Async database session.
        simulation_ids: List of simulation run IDs to compare.

    Returns:
        Dictionary containing comparison data for all requested simulations.

    Raises:
        HTTPException: 404 if any simulation run is not found.
    """
    comparisons = []

    for sim_id in simulation_ids:
        # Fetch simulation run
        run_result = await db.execute(
            select(SimulationRun).where(SimulationRun.id == sim_id)
        )
        simulation_run = run_result.scalar_one_or_none()

        if not simulation_run:
            raise HTTPException(
                status_code=404,
                detail=f"Simulation run with id {sim_id} not found",
            )

        # Fetch associated results
        results_query = await db.execute(
            select(SimulationResultModel).where(
                SimulationResultModel.simulation_run_id == sim_id
            )
        )
        results = results_query.scalars().all()

        comparisons.append({
            "simulation_id": simulation_run.id,
            "simulation_type": simulation_run.simulation_type,
            "name": simulation_run.name,
            "status": simulation_run.status,
            "parameters": json.loads(simulation_run.parameters) if simulation_run.parameters else {},
            "district_ids": json.loads(simulation_run.district_ids) if simulation_run.district_ids else [],
            "created_at": simulation_run.created_at.isoformat() if simulation_run.created_at else None,
            "completed_at": simulation_run.completed_at.isoformat() if simulation_run.completed_at else None,
            "results": [
                {
                    "id": r.id,
                    "district_id": r.district_id,
                    "metric_name": r.metric_name,
                    "metric_value": r.metric_value,
                    "metric_unit": r.metric_unit,
                    "confidence": r.confidence,
                    "severity_level": r.severity_level,
                }
                for r in results
            ],
            "results_count": len(results),
        })

    logger.info(
        "Compared %d simulations: %s",
        len(simulation_ids), simulation_ids,
    )

    return {
        "simulation_count": len(comparisons),
        "simulations": comparisons,
    }
