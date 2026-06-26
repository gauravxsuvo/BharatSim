"""Weather observation model.

Stores daily weather measurements for each district, including temperature,
humidity, rainfall, wind, pressure, visibility, cloud cover, and solar
radiation.
"""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class WeatherObservation(Base):
    """Daily weather observation for a district.

    Attributes:
        id: Primary key.
        district_id: Foreign key to the districts table.
        date: Date of the observation.
        temperature_max: Maximum temperature in Celsius.
        temperature_min: Minimum temperature in Celsius.
        temperature_avg: Average temperature in Celsius.
        humidity: Relative humidity as a percentage (0–100).
        rainfall_mm: Total rainfall in millimeters.
        wind_speed: Wind speed in km/h.
        wind_direction: Wind direction in degrees (0–360).
        pressure: Atmospheric pressure in hectopascals (hPa).
        visibility: Visibility distance in kilometers.
        cloud_cover: Cloud cover as a percentage (0–100).
        solar_radiation: Solar irradiance in W/m².
        created_at: Timestamp of record creation.
    """

    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(
        Integer,
        ForeignKey("districts.id"),
        nullable=False,
        index=True,
    )
    date = Column(Date, nullable=False, index=True)
    temperature_max = Column(Float, comment="Maximum temperature in Celsius")
    temperature_min = Column(Float, comment="Minimum temperature in Celsius")
    temperature_avg = Column(Float, comment="Average temperature in Celsius")
    humidity = Column(Float, comment="Relative humidity percentage")
    rainfall_mm = Column(Float, comment="Rainfall in millimeters")
    wind_speed = Column(Float, comment="Wind speed in km/h")
    wind_direction = Column(Float, comment="Wind direction in degrees")
    pressure = Column(Float, comment="Atmospheric pressure in hPa")
    visibility = Column(Float, comment="Visibility in km")
    cloud_cover = Column(Float, comment="Cloud cover percentage")
    solar_radiation = Column(Float, comment="Solar radiation in W/m²")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    district = relationship("District", back_populates="weather_observations")

    __table_args__ = (
        Index(
            "idx_weather_district_date",
            "district_id",
            "date",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<WeatherObservation(id={self.id}, district_id={self.district_id}, "
            f"date={self.date})>"
        )
