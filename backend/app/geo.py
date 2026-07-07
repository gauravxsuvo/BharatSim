"""Portable geometry storage helpers.

BharatSim stores district boundaries in PostGIS when running against
PostgreSQL, but also supports a **zero-dependency SQLite mode** (no Docker,
no PostGIS) for local demos and tests. Geometry is stored as PostGIS
geometry on Postgres and as WKT text on SQLite; these helpers hide the
difference from the rest of the app.
"""

from __future__ import annotations

from shapely.geometry import mapping, shape
from shapely import wkt as shapely_wkt

from app.config import settings

IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")


def storage_from_wkt(wkt_str: str):
    """Convert a WKT string into the value stored in the geometry column."""
    if IS_SQLITE:
        return wkt_str
    from geoalchemy2 import WKTElement
    return WKTElement(wkt_str, srid=4326)


def storage_from_geojson(geojson_geometry: dict):
    """Convert a GeoJSON geometry dict into the stored geometry value."""
    geom = shape(geojson_geometry)
    if IS_SQLITE:
        return geom.wkt
    from geoalchemy2.shape import from_shape
    return from_shape(geom, srid=4326)


def geojson_from_storage(value) -> dict:
    """Convert a stored geometry value back into a GeoJSON geometry dict."""
    if value is None:
        return {}
    if IS_SQLITE:
        return mapping(shapely_wkt.loads(value))
    from geoalchemy2.shape import to_shape
    return mapping(to_shape(value))
