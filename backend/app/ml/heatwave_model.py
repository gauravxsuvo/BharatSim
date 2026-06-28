"""Heatwave prediction model using LightGBM."""

import logging
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from lightgbm import LGBMClassifier

from app.ml.base import BaseTrainer, TrainingMetrics
from app.ml.utils import calculate_classification_metrics

logger = logging.getLogger(__name__)


class HeatwavePredictor(BaseTrainer):
    """LightGBM-based heatwave prediction model."""

    model_type = "heatwave"
    algorithm = "lightgbm"

    def prepare_features(self, data: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Extract features and target from weather data."""
        df = data.copy()

        feature_cols = ["temperature_max", "temperature_min", "humidity", "wind_speed", "solar_radiation"]
        for col in feature_cols:
            if col not in df.columns:
                df[col] = 0.0

        # Create temperature anomaly feature
        df["temp_anomaly"] = df["temperature_max"] - 35.0

        all_features = feature_cols + ["temp_anomaly"]
        df[all_features] = df[all_features].fillna(0)

        # Target: heatwave occurred (temp_max > 40)
        df["heatwave_occurred"] = (df["temperature_max"] > 40.0).astype(int)

        X = df[all_features].values
        y = df["heatwave_occurred"].values
        return X, y

    def train(self, X: np.ndarray, y: np.ndarray) -> TrainingMetrics:
        """Train LightGBM classifier for heatwave prediction."""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )

        self.model = LGBMClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            verbose=-1,
        )
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        metrics = calculate_classification_metrics(y_test, y_pred)

        logger.info(
            "Heatwave model trained - Accuracy: %.4f, F1: %.4f",
            metrics.accuracy, metrics.f1,
        )
        return metrics

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Return heatwave probability scores."""
        if self.model is None:
            raise RuntimeError("Model not trained or loaded.")
        probas = self.model.predict_proba(X)
        return probas[:, 1] if probas.shape[1] > 1 else probas[:, 0]

    def save(self, path: str) -> None:
        if self.model is None:
            raise RuntimeError("No model to save.")
        joblib.dump(self.model, path)
        logger.info("Heatwave model saved to %s", path)

    def load(self, path: str) -> None:
        self.model = joblib.load(path)
        logger.info("Heatwave model loaded from %s", path)
