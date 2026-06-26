"""Base classes for the BharatSim ML pipeline."""

from abc import ABC, abstractmethod
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Any
import logging

logger = logging.getLogger(__name__)


@dataclass
class TrainingMetrics:
    """Container for model training evaluation metrics."""
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    rmse: float | None = None
    mae: float | None = None
    r2: float | None = None

    def to_dict(self) -> dict:
        """Convert metrics to dictionary, excluding None values."""
        return {k: v for k, v in self.__dict__.items() if v is not None}


class BaseTrainer(ABC):
    """Abstract base class for all ML model trainers."""
    model_type: str = ""
    algorithm: str = ""
    model: Any = None

    @abstractmethod
    def prepare_features(self, data: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Prepare feature matrix X and target vector y from raw data."""
        pass

    @abstractmethod
    def train(self, X: np.ndarray, y: np.ndarray) -> TrainingMetrics:
        """Train the model and return evaluation metrics."""
        pass

    @abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Run prediction on input features."""
        pass

    @abstractmethod
    def save(self, path: str) -> None:
        """Save the trained model to disk."""
        pass

    @abstractmethod
    def load(self, path: str) -> None:
        """Load a trained model from disk."""
        pass
