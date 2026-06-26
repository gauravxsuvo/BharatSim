"""Simulation runner — orchestrates the full simulation pipeline.

Provides a high-level API that coordinates parameter validation, data
loading, and simulation execution through the registry.
"""

import logging
import time
from typing import Any

from app.simulation.base import SimulationResult
from app.simulation.registry import SimulatorRegistry

logger = logging.getLogger(__name__)


class SimulationRunner:
    """Orchestrates end-to-end simulation execution.

    Typical usage:
        runner = SimulationRunner()
        result = await runner.run(
            db=session,
            simulation_type="flood",
            district_ids=[1, 2, 3],
            date_range=(start_date, end_date),
            params={"rainfall_multiplier": 1.5},
        )
    """

    async def run(
        self,
        db,
        simulation_type: str,
        district_ids: list[int],
        date_range: tuple,
        params: dict[str, Any] | None = None,
    ) -> SimulationResult:
        """Execute a full simulation pipeline.

        Steps:
            1. Retrieve the appropriate simulator from the registry.
            2. Validate and merge user-supplied parameters with defaults.
            3. Load observational data for the requested districts and dates.
            4. Run the simulation model.
            5. Return structured results.

        Args:
            db: AsyncSession database connection.
            simulation_type: Registered simulation type key (e.g. 'flood').
            district_ids: List of district primary keys to simulate.
            date_range: Tuple of (start_date, end_date).
            params: Optional user-supplied parameter overrides.

        Returns:
            SimulationResult with district-level results and summary.

        Raises:
            ValueError: If the simulation_type is not registered or
                parameters fail validation.
            RuntimeError: If data loading or simulation execution fails.
        """
        params = params or {}
        start_time = time.perf_counter()

        # Step 1: Retrieve simulator
        logger.info(
            "Starting simulation: type='%s', districts=%d, date_range=%s",
            simulation_type,
            len(district_ids),
            date_range,
        )
        try:
            simulator = SimulatorRegistry.get(simulation_type)
        except ValueError as exc:
            logger.error("Simulator lookup failed: %s", exc)
            raise

        logger.info("Using simulator: %s", simulator.name)

        # Step 2: Validate parameters
        logger.info("Validating parameters: %s", params)
        try:
            validated_params = await simulator.validate_params(params)
        except (ValueError, TypeError) as exc:
            logger.error("Parameter validation failed: %s", exc)
            raise ValueError(f"Invalid parameters for '{simulation_type}': {exc}") from exc

        logger.info("Validated parameters: %s", validated_params)

        # Step 3: Load data
        logger.info("Loading data for %d district(s)...", len(district_ids))
        try:
            data = await simulator.load_data(db, district_ids, date_range)
        except Exception as exc:
            logger.error("Data loading failed: %s", exc)
            raise RuntimeError(
                f"Failed to load data for simulation '{simulation_type}': {exc}"
            ) from exc

        if data.empty:
            logger.warning(
                "No data found for districts=%s, date_range=%s. "
                "Returning empty results.",
                district_ids,
                date_range,
            )
            return SimulationResult(
                district_results=[],
                summary={
                    "simulation_type": simulation_type,
                    "districts_processed": 0,
                    "status": "no_data",
                    "message": "No observational data available for the selected "
                               "districts and date range.",
                },
            )

        logger.info("Loaded %d rows of data.", len(data))

        # Step 4: Run simulation
        logger.info("Executing simulation...")
        try:
            result = await simulator.run(data, validated_params)
        except Exception as exc:
            logger.error("Simulation execution failed: %s", exc)
            raise RuntimeError(
                f"Simulation '{simulation_type}' execution error: {exc}"
            ) from exc

        elapsed = time.perf_counter() - start_time

        # Enrich summary metadata
        result.summary.update({
            "simulation_type": simulation_type,
            "districts_requested": len(district_ids),
            "districts_processed": len(result.district_results),
            "data_rows": len(data),
            "execution_time_seconds": round(elapsed, 3),
            "status": "completed",
        })

        logger.info(
            "Simulation completed in %.3fs — %d district results generated.",
            elapsed,
            len(result.district_results),
        )

        return result
