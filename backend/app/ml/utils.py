"""ML utility functions for feature engineering and evaluation."""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
)

from app.ml.base import TrainingMetrics


def create_lagged_features(
    df: pd.DataFrame,
    columns: list[str],
    lags: list[int] | None = None,
) -> pd.DataFrame:
    """Create lagged features for specified columns."""
    if lags is None:
        lags = [1, 3, 7]
    df = df.copy()
    for col in columns:
        if col in df.columns:
            for lag in lags:
                df[f"{col}_lag_{lag}"] = df[col].shift(lag)
    return df


def create_rolling_features(
    df: pd.DataFrame,
    columns: list[str],
    windows: list[int] | None = None,
) -> pd.DataFrame:
    """Create rolling mean and std features for specified columns."""
    if windows is None:
        windows = [3, 7, 14]
    df = df.copy()
    for col in columns:
        if col in df.columns:
            for window in windows:
                df[f"{col}_rolling_mean_{window}"] = df[col].rolling(window).mean()
                df[f"{col}_rolling_std_{window}"] = df[col].rolling(window).std()
    return df


def train_test_split_temporal(
    df: pd.DataFrame,
    test_ratio: float = 0.2,
    date_column: str = "date",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split data chronologically into train and test sets."""
    df_sorted = df.sort_values(date_column).reset_index(drop=True)
    split_idx = int(len(df_sorted) * (1 - test_ratio))
    train_df = df_sorted.iloc[:split_idx].copy()
    test_df = df_sorted.iloc[split_idx:].copy()
    return train_df, test_df


def normalize_features(
    X: np.ndarray,
) -> tuple[np.ndarray, StandardScaler]:
    """Normalize features using StandardScaler."""
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    return X_scaled, scaler


def calculate_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> TrainingMetrics:
    """Calculate classification evaluation metrics."""
    return TrainingMetrics(
        accuracy=float(accuracy_score(y_true, y_pred)),
        precision=float(precision_score(y_true, y_pred, zero_division=0)),
        recall=float(recall_score(y_true, y_pred, zero_division=0)),
        f1=float(f1_score(y_true, y_pred, zero_division=0)),
    )


def calculate_regression_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> TrainingMetrics:
    """Calculate regression evaluation metrics."""
    return TrainingMetrics(
        rmse=float(np.sqrt(mean_squared_error(y_true, y_pred))),
        mae=float(mean_absolute_error(y_true, y_pred)),
        r2=float(r2_score(y_true, y_pred)),
    )
