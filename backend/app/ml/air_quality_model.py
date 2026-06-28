"""Air quality prediction model using LightGBM."""

import logging
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from lightgbm import LGBMRegressor

from app.ml.base import BaseTrainer, TrainingMetrics
from app.ml.utils import calculate_regression_metrics

logger = logging.getLogger(__name__)


class AirQualityPredictor(BaseTrainer):
    """LightGBM-based air quality index regression model."""

    model_type = "air_quality"
    algorithm = "lightgbm"

    def prepare_features(self, data: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Extract features and target for AQI prediction."""
        df = data.copy()

        if "temperature_avg" not in df.columns:
            df["temperature_avg"] = df.get("temperature_max", pd.Series(25.0, index=df.index))

        for col, default in [("humidity", 50.0), ("wind_speed", 5.0), ("pressure", 1013.0),
                              ("industrial_index", 0.5), ("vehicle_density", 0.5)]:
            if col not in df.columns:
                df[col] = default

        feature_cols = ["temperature_avg", "humidity", "wind_speed", "pressure",
                        "industrial_index", "vehicle_density"]
        df[feature_cols] = df[feature_cols].fillna(0)

        # Target: AQI value
        if "aqi" not in df.columns:
            # Synthesize AQI from available features
            rng = np.random.RandomState(42)
            base = 100 + (30 - df["wind_speed"]) * 3 + (df["humidity"] - 50) * 0.5
            industrial = df["industrial_index"] * 80
            vehicles = df["vehicle_density"] * 60
            df["aqi"] = (base + industrial + vehicles + rng.normal(0, 15, len(df))).clip(20, 500)

        X = df[feature_cols].values
        y = df["aqi"].values
        return X, y

    def train(self, X: np.ndarray, y: np.ndarray) -> TrainingMetrics:
        """Train LightGBM regressor for AQI prediction."""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model = LGBMRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            verbose=-1,
        )
        self.model.fit(X_train, y_train)

        y_pred = self.model.predict(X_test)
        metrics = calculate_regression_metrics(y_test, y_pred)

        logger.info(
            "Air quality model trained - RMSE: %.4f, R2: %.4f",
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
        logger.info("Air quality model saved to %s", path)

    def load(self, path: str) -> None:
        self.model = joblib.load(path)
        logger.info("Air quality model loaded from %s", path)
