"""District model with PostGIS geometry support.

Represents an administrative district of India, storing its name, state,
boundary geometry (as a MultiPolygon), and centroid coordinates.
"""

from sqlalchemy import Column, DateTime, Float, Index, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base
from app.geo import IS_SQLITE

# On PostgreSQL we use a real PostGIS geometry column; on SQLite (the
# no-Docker demo/test mode) we fall back to portable WKT text storage.
if IS_SQLITE:
    _GEOMETRY_COLUMN = Column(Text, nullable=False)
else:
    from geoalchemy2 import Geometry
    _GEOMETRY_COLUMN = Column(
        Geometry("MULTIPOLYGON", srid=4326, spatial_index=False),
        nullable=False,
    )


class District(Base):
    """Administrative district of India with spatial geometry.

    Attributes:
        id: Primary key.
        name: District name (e.g. "Pune").
        state_name: State or union territory name (e.g. "Maharashtra").
        state_code: Two-letter state code (e.g. "MH").
        district_code: Unique census district code.
        geometry: PostGIS MultiPolygon boundary in EPSG:4326.
        area_sq_km: Area of the district in square kilometers.
        centroid_lat: Latitude of the district centroid.
        centroid_lon: Longitude of the district centroid.
        created_at: Timestamp of record creation.
    """

    __tablename__ = "districts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    state_name = Column(String(255), nullable=False, index=True)
    state_code = Column(String(10))
    district_code = Column(String(10), unique=True)
    geometry = _GEOMETRY_COLUMN
    area_sq_km = Column(Float)
    centroid_lat = Column(Float)
    centroid_lon = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    weather_observations = relationship(
        "WeatherObservation",
        back_populates="district",
        cascade="all, delete-orphan",
    )
    river_observations = relationship(
        "RiverObservation",
        back_populates="district",
        cascade="all, delete-orphan",
    )
    population_data = relationship(
        "PopulationData",
        back_populates="district",
        cascade="all, delete-orphan",
    )

    # The PostGIS GiST spatial index only applies on PostgreSQL.
    __table_args__ = (
        ()
        if IS_SQLITE
        else (Index("idx_districts_geometry", "geometry", postgresql_using="gist"),)
    )

    def __repr__(self) -> str:
        return (
            f"<District(id={self.id}, name='{self.name}', "
            f"state='{self.state_name}')>"
        )
