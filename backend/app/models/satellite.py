"""Satellite data model.

Stores satellite imagery metadata and derived vegetation indices (NDVI)
for monitoring environmental changes across districts.
"""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)

from app.database import Base


class SatelliteData(Base):
    """Satellite observation metadata and derived indices.

    The district_id is nullable because a single satellite pass may cover
    multiple districts or an area that does not align with administrative
    boundaries.

    Attributes:
        id: Primary key.
        district_id: Optional foreign key to the districts table.
        satellite_name: Name of the satellite (e.g. Sentinel-2, Landsat-8).
        acquisition_date: Date the imagery was acquired.
        band_info: JSON string describing the spectral bands included.
        resolution_m: Spatial resolution in meters per pixel.
        cloud_cover_pct: Cloud cover percentage in the scene (0–100).
        ndvi_mean: Mean Normalized Difference Vegetation Index.
        ndvi_min: Minimum NDVI value in the scene.
        ndvi_max: Maximum NDVI value in the scene.
        file_path: Path to the raster file on disk or object storage.
        metadata_json: Arbitrary metadata stored as a JSON text blob.
        created_at: Timestamp of record creation.
    """

    __tablename__ = "satellite_data"

    id = Column(Integer, primary_key=True, index=True)
    district_id = Column(
        Integer,
        ForeignKey("districts.id"),
        nullable=True,
        index=True,
        comment="Nullable — imagery may span multiple districts",
    )
    satellite_name = Column(
        String(100),
        nullable=False,
        comment="e.g. Sentinel-2, Landsat-8, INSAT-3D",
    )
    acquisition_date = Column(Date, nullable=False, index=True)
    band_info = Column(
        Text, comment="JSON string describing spectral bands"
    )
    resolution_m = Column(Float, comment="Spatial resolution in meters")
    cloud_cover_pct = Column(
        Float, comment="Cloud cover percentage (0–100)"
    )
    ndvi_mean = Column(
        Float, comment="Mean Normalized Difference Vegetation Index"
    )
    ndvi_min = Column(Float, comment="Minimum NDVI value")
    ndvi_max = Column(Float, comment="Maximum NDVI value")
    file_path = Column(
        String(500), comment="Path to raster file on disk or object storage"
    )
    metadata_json = Column(Text, comment="Arbitrary metadata as JSON")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return (
            f"<SatelliteData(id={self.id}, satellite='{self.satellite_name}', "
            f"date={self.acquisition_date})>"
        )
