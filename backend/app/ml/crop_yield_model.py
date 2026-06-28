"""Crop yield prediction model using XGBoost."""

import logging
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from xgboost import XGBRegressor

from app.ml.base import BaseTrainer, TrainingMetrics
from app.ml.utils import calculate_regression_metrics

logger = logging.getLogger(__name__)


class CropYieldPredictor(BaseTrainer):
    """XGBoost-based crop yield regression model."""

    model_type = "crop_yield"
    algorithm = "xgboost"

    def prepare_features(self, data: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Extract features and target for crop yield prediction."""
        df = data.copy()

        # Use rainfall_mm as rainfall_total proxy
        if "rainfall_total" not in df.columns:
            df["rainfall_total"] = df.get("rainfall_mm", pd.Series(0.0, index=df.index))

        if "temperature_avg" not in df.columns:
            df["temperature_avg"] = 25.0

        if "ndvi_mean" not in df.columns:
            df["ndvi_mean"] = 0.5

        if "irrigation_pct" not in df.columns:
            df["irrigation_pct"] = 0.5

        feature_cols = ["rainfall_total", "temperature_avg", "ndvi_mean", "irrigation_pct"]
        df[feature_cols] = df[feature_cols].fillna(0)

        # Target: yield in tons per hectare
        if "yield_tons_per_hectare" not in df.columns:
            # Synthesize target from available features
            rainfall = df["rainfall_total"].clip(0, 500)
            temp = df["temperature_avg"]
            rng = np.random.RandomState(42)
            df["yield_tons_per_hectare"] = (
                2.5 * (1 + (rainfall - 100) / 500 * 0.3)
                * (1 - np.maximum(0, temp - 35) * 0.05)
                + rng.normal(0, 0.2, len(df))
            ).clip(0.5, 8.0)

        X = df[feature_cols].values
        y = df["yield_tons_per_hectare"].values
        return X, y

    def train(self, X: np.ndarray, y: np.ndarray) -> TrainingMetrics:
        """Train XGBoost regressor for crop yield."""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model = XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
        )
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        metrics = calculate_regression_metrics(y_test, y_pred)

        logger.info(
            "Crop yield model trained - RMSE: %.4f, R2: %.4f",
            metrics.rmse, metrics.r2,
        )
        return metrics

    def predict(self, X: np.ndarray) -> np.ndarray:
        if self.model is None:
            raise RuntimeError("Model not trained or loaded.")
        return self.model.predict(X)

    def save(self, path: str) -> None:
        if self.model is None:
            raise RuntimeError("No model to save.")
        joblib.dump(self.model, path)
        logger.info("Crop yield model saved to %s", path)

    def load(self, path: str) -> None:
        self.model = joblib.load(path)
        logger.info("Crop yield model loaded from %s", path)
