"""Simulation run and result models.

SimulationRun tracks the lifecycle of an environmental simulation
(flood, heatwave, crop yield, air quality). SimulationResult stores
per-district metrics produced by a completed simulation.
"""

import json
from typing import Any

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class SimulationRun(Base):
    """A simulation execution record.

    Attributes:
        id: Primary key.
        simulation_type: Type of simulation (flood/heatwave/crop_yield/air_quality).
        name: User-provided name for the simulation run.
        description: Optional description of the simulation.
        parameters: JSON-encoded simulation parameters.
        status: Execution status (pending/running/completed/failed).
        district_ids: JSON-encoded list of district IDs included.
        date_range_start: Start date for the simulation period.
        date_range_end: End date for the simulation period.
        created_at: Timestamp of record creation.
        completed_at: Timestamp of simulation completion (nullable).
    """

    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    simulation_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="flood/heatwave/crop_yield/air_quality",
    )
    name = Column(String(255), nullable=False)
    description = Column(Text)
    parameters = Column(Text, comment="JSON-encoded simulation parameters")
    status = Column(
        String(50),
        default="pending",
        nullable=False,
        index=True,
        comment="pending/running/completed/failed",
    )
    district_ids = Column(
        Text, comment="JSON-encoded list of district IDs"
    )
    date_range_start = Column(Date)
    date_range_end = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    results = relationship(
        "SimulationResult",
        back_populates="simulation_run",
        cascade="all, delete-orphan",
    )

    def get_parameters(self) -> dict[str, Any]:
        """Deserialize the parameters JSON string."""
        if self.parameters:
            return json.loads(self.parameters)
        return {}

    def set_parameters(self, params: dict[str, Any]) -> None:
        """Serialize parameters dict to JSON string."""
        self.parameters = json.dumps(params)

    def get_district_ids(self) -> list[int]:
        """Deserialize the district_ids JSON string."""
        if self.district_ids:
            return json.loads(self.district_ids)
        return []

    def set_district_ids(self, ids: list[int]) -> None:
        """Serialize district IDs list to JSON string."""
        self.district_ids = json.dumps(ids)

    def __repr__(self) -> str:
        return (
            f"<SimulationRun(id={self.id}, type='{self.simulation_type}', "
            f"name='{self.name}', status='{self.status}')>"
        )


class SimulationResult(Base):
    """A single metric result from a simulation run for a district.

    Attributes:
        id: Primary key.
        simulation_run_id: Foreign key to the simulation_runs table.
        district_id: Foreign key to the districts table.
        metric_name: Name of the metric (e.g. "flood_probability").
        metric_value: Numeric value of the metric.
        metric_unit: Unit of measurement (e.g. "%", "mm", "°C").
        confidence: Confidence score of the prediction (0–1).
        severity_level: Severity classification string.
        geojson_data: GeoJSON text for map overlay visualisation.
        created_at: Timestamp of record creation.
    """

    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    simulation_run_id = Column(
        Integer,
        ForeignKey("simulation_runs.id"),
        nullable=False,
        index=True,
    )
    district_id = Column(
        Integer,
        ForeignKey("districts.id"),
        nullable=False,
        index=True,
    )
    metric_name = Column(String(255), nullable=False)
    metric_value = Column(Float)
    metric_unit = Column(String(50))
    confidence = Column(Float, comment="Confidence score 0–1")
    severity_level = Column(
        String(50), comment="Severity classification"
    )
    geojson_data = Column(Text, comment="GeoJSON for map overlay")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    simulation_run = relationship(
        "SimulationRun", back_populates="results"
    )

    __table_args__ = (
        Index(
            "idx_simresult_run_district",
            "simulation_run_id",
            "district_id",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<SimulationResult(id={self.id}, run={self.simulation_run_id}, "
            f"district={self.district_id}, metric='{self.metric_name}')>"
        )
