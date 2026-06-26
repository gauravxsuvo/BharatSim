"""SQLAlchemy models for BharatSim.

Imports all models so that Alembic and the declarative base can discover
them for automatic migration generation.
"""

from app.models.district import District
from app.models.weather import WeatherObservation
from app.models.river import RiverObservation
from app.models.population import PopulationData
from app.models.satellite import SatelliteData
from app.models.simulation import SimulationRun, SimulationResult
from app.models.ml_model import MLModel

__all__ = [
    "District",
    "WeatherObservation",
    "RiverObservation",
    "PopulationData",
    "SatelliteData",
    "SimulationRun",
    "SimulationResult",
    "MLModel",
]
