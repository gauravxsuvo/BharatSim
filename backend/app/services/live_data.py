"""Optional live weather data source.

When a live data source is enabled (``USE_LIVE_DATA=true`` or an
``OPENWEATHER_API_KEY`` is set in ``backend/.env``), the seed pulls real daily
observations from the keyless Open-Meteo archive API instead of the bundled
sample CSVs. Everything here is best-effort: any failure returns ``None`` so
the caller transparently falls back to the offline sample data.
"""

from __future__ import annotations

import logging
from datetime import date

import httpx

logger = logging.getLogger(__name__)

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
_DAILY = ",".join([
    "temperature_2m_max", "temperature_2m_min", "temperature_2m_mean",
    "precipitation_sum", "wind_speed_10m_max", "wind_direction_10m_dominant",
    "relative_humidity_2m_mean", "surface_pressure_mean", "shortwave_radiation_sum",
])


def fetch_district_weather(
    lat: float, lon: float, start: date, end: date
) -> list[dict] | None:
    """Fetch daily weather for one location. Returns rows or None on failure."""
    try:
        resp = httpx.get(
            ARCHIVE_URL,
            params={
                "latitude": lat, "longitude": lon,
                "start_date": start.isoformat(), "end_date": end.isoformat(),
                "daily": _DAILY, "timezone": "auto",
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        daily = resp.json().get("daily", {})
        dates = daily.get("time", [])
        if not dates:
            return None
        rows = []
        for i, d in enumerate(dates):
            def g(key: str, default=0.0):
                arr = daily.get(key) or []
                v = arr[i] if i < len(arr) else None
                return v if v is not None else default
            rows.append({
                "date": d,
                "temperature_max": g("temperature_2m_max"),
                "temperature_min": g("temperature_2m_min"),
                "temperature_avg": g("temperature_2m_mean"),
                "humidity": g("relative_humidity_2m_mean", 50.0),
                "rainfall_mm": g("precipitation_sum"),
                "wind_speed": g("wind_speed_10m_max"),
                "wind_direction": g("wind_direction_10m_dominant"),
                "pressure": g("surface_pressure_mean", 1013.0),
                "visibility": 10.0,
                "cloud_cover": 0.0,
                "solar_radiation": g("shortwave_radiation_sum"),
            })
        return rows
    except Exception as exc:  # noqa: BLE001 — never break seeding on live-fetch errors
        logger.warning("Live weather fetch failed for (%.2f, %.2f): %s", lat, lon, exc)
        return None
