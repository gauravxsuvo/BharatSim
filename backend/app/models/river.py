"""River observation model.

Stores daily river monitoring data for each district, including water level,
discharge, and flood status categorization.
"""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class RiverObservation(Base):
    """Daily river monitoring observation for a district.

    Attributes:
        id: Primary key.
        district_id: Foreign key to the districts table.
        river_name: Name of the river being monitored.
        station_name: Name of the monitoring station.
        date: Date of the observation.
        water_level_m: Water level in meters above datum.
        discharge_cumecs: Water discharge in cubic meters per second.
        flood_status: Flood alert level (normal/alert/warning/danger/severe).
        danger_level_m: Danger water level threshold in meters.
        warning_level_m: Warning water level threshold in meters.
        created_at: Timestamp of record creation.
    """

    __tablename__ = "river_observations"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(
        Integer,
        ForeignKey("districts.id"),
        nullable=False,
        index=True,
    )
    river_name = Column(String(255), nullable=False)
    station_name = Column(String(255))
    date = Column(Date, nullable=False, index=True)
    water_level_m = Column(Float, comment="Water level in meters above datum")
    discharge_cumecs = Column(
        Float, comment="Discharge in cubic meters per second"
    )
    flood_status = Column(
        String(50),
        default="normal",
        comment="Flood status: normal/alert/warning/danger/severe",
    )
    danger_level_m = Column(Float, comment="Danger level threshold in meters")
    warning_level_m = Column(
        Float, comment="Warning level threshold in meters"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    district = relationship("District", back_populates="river_observations")

    __table_args__ = (
        Index(
            "idx_river_district_date",
            "district_id",
            "date",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<RiverObservation(id={self.id}, river='{self.river_name}', "
            f"district_id={self.district_id}, date={self.date}, "
            f"status='{self.flood_status}')>"
        )
