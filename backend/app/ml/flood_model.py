"""Flood prediction model using XGBoost."""

import logging
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from app.ml.base import BaseTrainer, TrainingMetrics
from app.ml.utils import calculate_classification_metrics

logger = logging.getLogger(__name__)


class FloodPredictor(BaseTrainer):
    """XGBoost-based flood prediction model."""

    model_type = "flood"
    algorithm = "xgboost"

    def prepare_features(self, data: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Extract features and target from flood-related data."""
        df = data.copy()

        feature_cols = ["rainfall_mm", "water_level_m", "discharge_cumecs", "humidity", "temperature_avg"]
        for col in feature_cols:
            if col not in df.columns:
                df[col] = 0.0

        # Create rolling 7-day rainfall sum
        df = df.sort_values("date") if "date" in df.columns else df
        df["rolling_7d_rainfall"] = df["rainfall_mm"].rolling(7, min_periods=1).sum()

        all_features = feature_cols + ["rolling_7d_rainfall"]
        df[all_features] = df[all_features].fillna(0)

        # Target: flood occurred (binary from flood_status)
        if "flood_status" in df.columns:
            df["flood_occurred"] = (df["flood_status"] != "normal").astype(int)
        else:
            df["flood_occurred"] = 0

        X = df[all_features].values
        y = df["flood_occurred"].values
        return X, y

    def train(self, X: np.ndarray, y: np.ndarray) -> TrainingMetrics:
        """Train XGBoost classifier for flood prediction."""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )

        self.model = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            eval_metric="logloss",
        )
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        metrics = calculate_classification_metrics(y_test, y_pred)

        logger.info(
            "Flood model trained - Accuracy: %.4f, F1: %.4f",
            metrics.accuracy, metrics.f1,
        )
        return metrics

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Return flood probability scores."""
        if self.model is None:
            raise RuntimeError("Model not trained or loaded. Call train() or load() first.")
        probas = self.model.predict_proba(X)
        return probas[:, 1] if probas.shape[1] > 1 else probas[:, 0]

    def save(self, path: str) -> None:
        """Save the trained model to disk."""
        if self.model is None:
            raise RuntimeError("No model to save. Train the model first.")
        joblib.dump(self.model, path)
        logger.info("Flood model saved to %s", path)

    def load(self, path: str) -> None:
        """Load a trained model from disk."""
        self.model = joblib.load(path)
        logger.info("Flood model loaded from %s", path)
