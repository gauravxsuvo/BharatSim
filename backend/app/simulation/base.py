"""Base classes for the BharatSim simulation engine."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
import pandas as pd
import logging

logger = logging.getLogger(__name__)


@dataclass
class SimulationResult:
    """Container for simulation output data.

    Attributes:
        district_results: List of per-district result dictionaries containing
            simulation metrics, risk scores, and affected population data.
        summary: Aggregated summary statistics across all simulated districts.
        geojson_overlay: Optional GeoJSON FeatureCollection for map visualization
            of simulation results.
    """
    district_results: list[dict] = field(default_factory=list)
    summary: dict = field(default_factory=dict)
    geojson_overlay: dict | None = None


class BaseSimulator(ABC):
    """Abstract base class for all simulation modules.

    Subclasses must implement parameter_schema, validate_params, load_data,
    and run methods to provide a complete simulation pipeline.
    """
    name: str = ""
    description: str = ""
    simulation_type: str = ""

    @property
    @abstractmethod
    def parameter_schema(self) -> dict:
        """Return the JSON Schema describing accepted simulation parameters.

        Returns:
            dict: A JSON Schema object with properties, types, ranges,
                  and default values for each tunable parameter.
        """
        pass

    @abstractmethod
    async def validate_params(self, params: dict) -> dict:
        """Validate and sanitize incoming simulation parameters.

        Args:
            params: Raw parameter dictionary from the API request.

        Returns:
            dict: Cleaned and validated parameters with defaults applied.

        Raises:
            ValueError: If any parameter value is outside its valid range.
        """
        pass

    @abstractmethod
    async def load_data(self, db, district_ids: list[int], date_range: tuple) -> pd.DataFrame:
        """Load required observational data from the database.

        Args:
            db: AsyncSession database connection.
            district_ids: List of district primary keys to query.
            date_range: Tuple of (start_date, end_date) for temporal filtering.

        Returns:
            pd.DataFrame: Combined dataset ready for simulation processing.
        """
        pass

    @abstractmethod
    async def run(self, data: pd.DataFrame, params: dict) -> SimulationResult:
        """Execute the simulation logic on loaded data.

        Args:
            data: Pre-loaded DataFrame from load_data().
            params: Validated parameters from validate_params().

        Returns:
            SimulationResult: Container with district-level results,
                summary statistics, and optional GeoJSON overlay.
        """
        pass
