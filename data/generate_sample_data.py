"""Generate realistic sample datasets for BharatSim.

Produces deterministic, climatologically-plausible CSVs so the platform can be
demoed end-to-end with **no external API keys and no live data feeds**:

    python data/generate_sample_data.py

Output (written to data/sample/):
    weather_sample.csv       daily weather per district
    river_flow_sample.csv    daily river gauge readings (river districts)
    population_sample.csv     census-style demographics (one row per district)
    satellite_sample.csv      monthly NDVI / satellite metadata

When you later add a real data provider key to backend/.env (e.g.
OPENWEATHER_API_KEY) the backend can pull live observations instead — these
CSVs are the offline fallback used by `python -m app.seed`.
"""

from __future__ import annotations

import csv
import math
import os
import random
from datetime import date, timedelta

SEED = 42
START = date(2024, 1, 1)
DAYS = 120  # Jan–Apr 2024

OUT_DIR = os.path.join(os.path.dirname(__file__), "sample")

# code, name, state, lat, base_temp(°C Jan), monsoon_bias, aqi_base, river, station, density
DISTRICTS = [
    ("MH001", "Mumbai", "Maharashtra", 18.9, 27.5, 1.3, 145, "Mithi River", "Powai", 20634),
    ("MH002", "Pune", "Maharashtra", 18.5, 24.0, 0.9, 92, "Mula River", "Aundh", 603),
    ("TN001", "Chennai", "Tamil Nadu", 13.0, 28.0, 1.1, 110, "Cooum River", "Napier", 26903),
    ("TN002", "Coimbatore", "Tamil Nadu", 11.0, 26.0, 0.7, 75, None, None, 750),
    ("UP001", "Lucknow", "Uttar Pradesh", 26.8, 17.5, 0.6, 268, "Gomti River", "Gau Ghat", 1815),
    ("UP002", "Varanasi", "Uttar Pradesh", 25.3, 17.0, 0.7, 312, "Ganga", "Dashashwamedh", 2399),
    ("RJ001", "Jaipur", "Rajasthan", 26.9, 16.5, 0.3, 190, None, None, 598),
    ("RJ002", "Jodhpur", "Rajasthan", 26.3, 18.0, 0.2, 220, None, None, 161),
    ("WB001", "Kolkata", "West Bengal", 22.5, 20.5, 1.2, 165, "Hooghly", "Palta", 24306),
    ("WB002", "Darjeeling", "West Bengal", 27.0, 8.0, 1.4, 55, "Teesta", "Teesta Bazar", 586),
]

WIND_DIRS_BY_SEASON = {"winter": 315, "premonsoon": 200, "monsoon": 240}


def _season(d: date) -> str:
    if d.month in (12, 1, 2):
        return "winter"
    if d.month in (3, 4, 5):
        return "premonsoon"
    return "monsoon"


def _seasonal_temp(base: float, lat: float, d: date, rng: random.Random) -> float:
    # Warm up from Jan → Apr; northern districts warm faster in pre-monsoon.
    day_of_year = d.timetuple().tm_yday
    warming = math.sin((day_of_year - 15) / 365 * math.pi) * (10 if lat > 22 else 6)
    return round(base + warming + rng.uniform(-2.0, 2.0), 1)


def generate_weather(rng: random.Random) -> list[dict]:
    rows = []
    for code, name, state, lat, base_temp, mon, aqi, *_ in DISTRICTS:
        for i in range(DAYS):
            d = START + timedelta(days=i)
            season = _season(d)
            t_avg = _seasonal_temp(base_temp, lat, d, rng)
            spread = rng.uniform(6, 11)
            t_max = round(t_avg + spread / 2, 1)
            t_min = round(t_avg - spread / 2, 1)
            # Rainfall: mostly dry Jan–Apr, occasional pre-monsoon showers.
            rain = 0.0
            if season == "premonsoon" and rng.random() < 0.12 * mon:
                rain = round(rng.uniform(2, 45) * mon, 1)
            humidity = round(min(95, max(25, 55 + (rain * 0.5) + rng.uniform(-12, 12) + (15 if lat < 20 else 0))), 1)
            wind = round(rng.uniform(6, 22), 1)
            wdir = round((WIND_DIRS_BY_SEASON[season] + rng.uniform(-40, 40)) % 360, 0)
            pressure = round(1013 + rng.uniform(-6, 6) - (t_avg - 25) * 0.2, 1)
            visibility = round(max(1.5, 10 - (aqi / 60) + rng.uniform(-1.5, 1.5)), 1)
            cloud = round(min(100, max(0, rain * 1.5 + rng.uniform(0, 35))), 1)
            solar = round(max(80, 260 - cloud * 1.4 + rng.uniform(-25, 25)), 1)
            rows.append({
                "district_code": code, "date": d.isoformat(),
                "temperature_max": t_max, "temperature_min": t_min, "temperature_avg": t_avg,
                "humidity": humidity, "rainfall_mm": rain, "wind_speed": wind,
                "wind_direction": int(wdir), "pressure": pressure, "visibility": visibility,
                "cloud_cover": cloud, "solar_radiation": solar,
            })
    return rows


def generate_rivers(rng: random.Random) -> list[dict]:
    rows = []
    for code, name, state, lat, base_temp, mon, aqi, river, station, _ in DISTRICTS:
        if not river:
            continue
        danger = round(rng.uniform(4.0, 9.5), 1)
        warning = round(danger - rng.uniform(0.8, 1.5), 1)
        level = round(warning - rng.uniform(1.5, 2.5), 2)
        for i in range(DAYS):
            d = START + timedelta(days=i)
            # Random walk with slow pre-monsoon rise.
            level += rng.uniform(-0.15, 0.18) + (0.02 * mon if d.month >= 4 else 0)
            level = round(max(0.4, level), 2)
            discharge = round(max(5, level * rng.uniform(60, 140)), 1)
            if level >= danger:
                status = "danger"
            elif level >= warning:
                status = "warning"
            elif level >= warning - 1:
                status = "alert"
            else:
                status = "normal"
            rows.append({
                "district_code": code, "river_name": river, "station_name": station,
                "date": d.isoformat(), "water_level_m": level, "discharge_cumecs": discharge,
                "flood_status": status, "danger_level_m": danger, "warning_level_m": warning,
            })
    return rows


def generate_population(rng: random.Random) -> list[dict]:
    rows = []
    for code, name, state, lat, base_temp, mon, aqi, river, station, density in DISTRICTS:
        # Back out a total from density with a plausible area, keep it stable.
        total = int(density * rng.uniform(120, 900))
        male = int(total * rng.uniform(0.505, 0.52))
        female = total - male
        urban_frac = rng.uniform(0.35, 0.98) if density > 1000 else rng.uniform(0.15, 0.45)
        urban = int(total * urban_frac)
        rows.append({
            "district_code": code, "year": 2024, "total_population": total,
            "male_population": male, "female_population": female,
            "density_per_sq_km": density, "urban_population": urban,
            "rural_population": total - urban,
            "literacy_rate": round(rng.uniform(72, 92), 1),
            "sex_ratio": round(female / male * 1000, 0),
            "growth_rate": round(rng.uniform(0.8, 2.2), 2),
        })
    return rows


def generate_satellite(rng: random.Random) -> list[dict]:
    rows = []
    sats = ["Sentinel-2", "Landsat-8", "INSAT-3D"]
    for code, name, state, lat, base_temp, mon, aqi, *_ in DISTRICTS:
        for month in range(1, 5):
            d = date(2024, month, rng.randint(3, 25))
            # Greener where wetter / cooler; arid Rajasthan lower NDVI.
            green = 0.6 if mon > 1.0 else (0.25 if "RJ" in code else 0.45)
            ndvi_mean = round(min(0.9, max(0.05, green + rng.uniform(-0.1, 0.12))), 3)
            rows.append({
                "district_code": code, "satellite_name": rng.choice(sats),
                "acquisition_date": d.isoformat(),
                "ndvi_mean": ndvi_mean,
                "ndvi_min": round(max(0.0, ndvi_mean - rng.uniform(0.15, 0.3)), 3),
                "ndvi_max": round(min(1.0, ndvi_mean + rng.uniform(0.1, 0.25)), 3),
                "cloud_cover_pct": round(rng.uniform(0, 40), 1),
                "resolution_m": rng.choice([10, 30, 250]),
                "file_path": f"s3://bharatsim/satellite/{code}_{d.isoformat()}.tif",
            })
    return rows


def _write(filename: str, rows: list[dict]) -> None:
    path = os.path.join(OUT_DIR, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"  {filename}: {len(rows)} rows")


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    rng = random.Random(SEED)
    print("Generating BharatSim sample datasets…")
    _write("weather_sample.csv", generate_weather(rng))
    _write("river_flow_sample.csv", generate_rivers(rng))
    _write("population_sample.csv", generate_population(rng))
    _write("satellite_sample.csv", generate_satellite(rng))
    print("Done. Seed the DB with: cd backend && python -m app.seed")


if __name__ == "__main__":
    main()
