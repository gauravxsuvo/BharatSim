"""Pydantic schemas for simulation data.

Defines request and response schemas for creating, listing, and comparing
simulation runs and their per-district results.
"""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SimulationParams(BaseModel):
    """Parameters for creating a new simulation run.

    Attributes:
        simulation_type: Type of simulation (flood/heatwave/crop_yield/air_quality).
        name: User-provided name for the run.
        description: Optional description.
        district_ids: List of district IDs to include in the simulation.
        date_range_start: Start date for the simulation period.
        date_range_end: End date for the simulation period.
        parameters: Additional algorithm-specific parameters.
    """

    simulation_type: str = Field(
        ...,
        pattern=r"^(flood|heatwave|crop_yield|air_quality)$",
        description="Type of simulation",
    )
    name: str = Field(
        ..., min_length=1, max_length=255, description="Simulation name"
    )
    description: str | None = Field(
        None, description="Simulation description"
    )
    district_ids: list[int] = Field(
        ..., min_length=1, description="List of district IDs to simulate"
    )
    date_range_start: date = Field(
        ..., description="Start date for simulation"
    )
    date_range_end: date = Field(
        ..., description="End date for simulation"
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional simulation parameters",
    )


class SimulationResultResponse(BaseModel):
    """Response schema for a single simulation result metric.

    Attributes:
        id: Result record ID.
        district_id: District this result applies to.
        metric_name: Name of the metric (e.g. "flood_probability").
        metric_value: Numeric value.
        metric_unit: Unit of measurement.
        confidence: Model confidence (0–1).
        severity_level: Human-readable severity classification.
    """

    id: int
    district_id: int
    metric_name: str
    metric_value: float | None = None
    metric_unit: str | None = None
    confidence: float | None = None
    severity_level: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SimulationResponse(BaseModel):
    """Response schema for a simulation run with its results.

    Attributes:
        id: Simulation run ID.
        simulation_type: Type of simulation.
        name: User-provided name.
        description: Optional description.
        status: Current execution status.
        parameters: Algorithm parameters (deserialized).
        created_at: Creation timestamp.
        completed_at: Completion timestamp (null if still running).
        results: List of per-district result metrics.
    """

    id: int
    simulation_type: str
    name: str
    description: str | None = None
    status: str
    parameters: dict[str, Any] | None = None
    created_at: datetime
    completed_at: datetime | None = None
    results: list[SimulationResultResponse] = []

    model_config = ConfigDict(from_attributes=True)


class SimulationCompareRequest(BaseModel):
    """Request schema for comparing multiple simulation runs.

    Attributes:
        simulation_ids: List of simulation run IDs to compare (min 2).
    """

    simulation_ids: list[int] = Field(
        ...,
        min_length=2,
        description="IDs of simulations to compare",
    )
