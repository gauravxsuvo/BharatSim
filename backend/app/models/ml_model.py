"""ML model registry.

Stores metadata, file paths, and evaluation metrics for trained machine
learning models used by the simulation engine.
"""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    func,
)

from app.database import Base


class MLModel(Base):
    """Registry entry for a trained machine learning model.

    Attributes:
        id: Primary key.
        model_type: Domain the model targets (flood/heatwave/crop_yield/air_quality).
        model_name: Human-readable name of the model.
        algorithm: Algorithm used (xgboost/lightgbm/pytorch/sklearn).
        version: Semantic version string of the model.
        file_path: Path to the serialised model file on disk.
        accuracy: Classification accuracy (0–1).
        precision_score: Precision metric (0–1).
        recall: Recall metric (0–1).
        f1_score: F1 score (0–1).
        rmse: Root Mean Squared Error for regression models.
        mae: Mean Absolute Error for regression models.
        r2_score: R² coefficient of determination.
        training_data_info: Description of the training dataset.
        hyperparameters: JSON-encoded hyperparameter dictionary.
        is_active: Whether this model is the currently active model for its type.
        created_at: Timestamp of record creation.
        updated_at: Timestamp of last update.
    """

    __tablename__ = "ml_models"

    id = Column(Integer, primary_key=True, index=True)
    model_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="flood/heatwave/crop_yield/air_quality",
    )
    model_name = Column(String(255), nullable=False)
    algorithm = Column(
        String(50),
        nullable=False,
        comment="xgboost/lightgbm/pytorch/sklearn",
    )
    version = Column(String(50))
    file_path = Column(String(500), comment="Path to serialised model file")

    # Classification metrics
    accuracy = Column(Float, comment="Classification accuracy (0–1)")
    precision_score = Column(Float, comment="Precision (0–1)")
    recall = Column(Float, comment="Recall (0–1)")
    f1_score = Column(Float, comment="F1 score (0–1)")

    # Regression metrics
    rmse = Column(Float, comment="Root Mean Squared Error")
    mae = Column(Float, comment="Mean Absolute Error")
    r2_score = Column(Float, comment="R² coefficient of determination")

    # Metadata
    training_data_info = Column(
        Text, comment="Description of training dataset"
    )
    hyperparameters = Column(Text, comment="JSON-encoded hyperparameters")
    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether this is the active model for its type",
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:
        return (
            f"<MLModel(id={self.id}, name='{self.model_name}', "
            f"type='{self.model_type}', algo='{self.algorithm}', "
            f"active={self.is_active})>"
        )
