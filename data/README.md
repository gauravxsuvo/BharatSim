# 📊 BharatSim Data Directory

This directory contains all data assets for the BharatSim digital twin platform, including initialization scripts, sample datasets, and documentation for data ingestion.

---

## 📁 Directory Structure

```
data/
├── init.sql                    # PostgreSQL/PostGIS initialization script
├── README.md                   # This file
└── sample/                     # Sample datasets for development & testing
    ├── weather_sample.csv      # Weather observations (10 districts × 30 days)
    ├── river_flow_sample.csv   # River flow measurements (5 rivers × 30 days)
    ├── population_sample.csv   # Population census data (10 districts)
    └── air_quality_sample.csv  # Air quality index data (10 districts × 30 days)
```

---

## 📋 Dataset Specifications

### 1. 🌤️ Weather Data

**File pattern:** `weather_*.csv`

| Column | Type | Unit | Description | Example |
|--------|------|------|-------------|---------|
| `district_code` | string | — | Unique district identifier | `MH001` |
| `date` | date | YYYY-MM-DD | Observation date | `2024-01-15` |
| `temperature_max` | float | °C | Maximum daily temperature | `32.5` |
| `temperature_min` | float | °C | Minimum daily temperature | `24.1` |
| `temperature_avg` | float | °C | Average daily temperature | `28.3` |
| `humidity` | float | % | Relative humidity (0–100) | `72.4` |
| `rainfall_mm` | float | mm | Total daily rainfall | `0.0` |
| `wind_speed` | float | km/h | Average wind speed | `14.2` |
| `wind_direction` | string | — | Cardinal direction (N, NE, E, SE, S, SW, W, NW) | `NW` |
| `pressure` | float | hPa | Atmospheric pressure | `1013.2` |
| `visibility` | float | km | Horizontal visibility | `8.5` |
| `cloud_cover` | float | % | Cloud cover percentage (0–100) | `25.0` |
| `solar_radiation` | float | W/m² | Solar irradiance | `215.4` |

**Data Sources:** India Meteorological Department (IMD), NASA POWER, OpenWeatherMap

---

### 2. 🌊 River Flow Data

**File pattern:** `river_flow_*.csv`

| Column | Type | Unit | Description | Example |
|--------|------|------|-------------|---------|
| `district_code` | string | — | District where station is located | `UP002` |
| `river_name` | string | — | Name of the river | `Ganges` |
| `station_name` | string | — | Monitoring station name | `Varanasi Ghat` |
| `date` | date | YYYY-MM-DD | Observation date | `2024-01-15` |
| `water_level_m` | float | m | Water level above datum | `5.2` |
| `discharge_cumecs` | float | m³/s | Water discharge rate | `2450.0` |
| `flood_status` | string | — | Status: `normal`, `warning`, `danger`, `flood` | `normal` |
| `danger_level_m` | float | m | Danger threshold level | `10.0` |
| `warning_level_m` | float | m | Warning threshold level | `8.0` |

**Data Sources:** Central Water Commission (CWC), India-WRIS

**Flood Status Definitions:**
- `normal` — Water level below warning level
- `warning` — Water level between warning and danger levels
- `danger` — Water level at or above danger level
- `flood` — Active flooding conditions

---

### 3. 👥 Population Data

**File pattern:** `population_*.csv`

| Column | Type | Unit | Description | Example |
|--------|------|------|-------------|---------|
| `district_code` | string | — | Unique district identifier | `TN001` |
| `year` | int | — | Census/estimate year | `2024` |
| `total_population` | int | persons | Total population | `8696010` |
| `male_population` | int | persons | Male population | `4384231` |
| `female_population` | int | persons | Female population | `4311779` |
| `density_per_sq_km` | float | persons/km² | Population density | `26903.0` |
| `urban_population` | int | persons | Urban population | `8696010` |
| `rural_population` | int | persons | Rural population | `0` |
| `literacy_rate` | float | % | Literacy rate (0–100) | `90.2` |
| `sex_ratio` | int | females/1000 males | Sex ratio | `984` |
| `growth_rate` | float | % | Annual growth rate | `0.89` |

**Data Sources:** Census of India, NITI Aayog, Registrar General of India

---

### 4. 🛰️ Satellite Data

**File pattern:** `satellite_*.csv`

| Column | Type | Unit | Description | Example |
|--------|------|------|-------------|---------|
| `district_code` | string | — | District covered by acquisition | `RJ001` |
| `satellite_name` | string | — | Satellite platform name | `Sentinel-2` |
| `acquisition_date` | date | YYYY-MM-DD | Image acquisition date | `2024-01-15` |
| `resolution_m` | float | m | Spatial resolution | `10.0` |
| `cloud_cover_pct` | float | % | Cloud cover in scene (0–100) | `12.5` |
| `ndvi_mean` | float | — | Mean NDVI value (-1 to 1) | `0.42` |
| `ndvi_min` | float | — | Minimum NDVI value (-1 to 1) | `0.05` |
| `ndvi_max` | float | — | Maximum NDVI value (-1 to 1) | `0.78` |
| `file_path` | string | — | Path to raster file | `s3://bharatsim/sentinel2/...` |

**Data Sources:** ISRO Bhuvan, Copernicus Open Access Hub, USGS Earth Explorer

**NDVI Interpretation:**
| NDVI Range | Land Cover |
|------------|------------|
| -1.0 to 0.0 | Water bodies, barren land |
| 0.0 to 0.2 | Urban areas, bare soil |
| 0.2 to 0.4 | Sparse vegetation, shrubland |
| 0.4 to 0.6 | Moderate vegetation, cropland |
| 0.6 to 1.0 | Dense vegetation, forests |

---

### 5. 🏭 Air Quality Data

**File pattern:** `air_quality_*.csv`

| Column | Type | Unit | Description | Example |
|--------|------|------|-------------|---------|
| `district_code` | string | — | District where station is located | `UP001` |
| `date` | date | YYYY-MM-DD | Observation date | `2024-01-15` |
| `pm25` | float | µg/m³ | PM2.5 concentration | `185.3` |
| `pm10` | float | µg/m³ | PM10 concentration | `267.8` |
| `no2` | float | µg/m³ | Nitrogen dioxide concentration | `45.2` |
| `so2` | float | µg/m³ | Sulfur dioxide concentration | `12.8` |
| `co` | float | mg/m³ | Carbon monoxide concentration | `1.8` |
| `o3` | float | µg/m³ | Ozone concentration | `42.1` |
| `aqi` | int | — | Air Quality Index (0–500) | `285` |
| `station_name` | string | — | Monitoring station name | `Lalbagh Lucknow` |

**Data Sources:** Central Pollution Control Board (CPCB), SAFAR, OpenAQ

**AQI Categories (India NAQI):**
| AQI Range | Category | Health Impact |
|-----------|----------|---------------|
| 0–50 | 🟢 Good | Minimal impact |
| 51–100 | 🟡 Satisfactory | Minor breathing discomfort to sensitive people |
| 101–200 | 🟠 Moderate | Breathing discomfort to people with lung/heart disease |
| 201–300 | 🔴 Poor | Breathing discomfort on prolonged exposure |
| 301–400 | 🟣 Very Poor | Respiratory illness on prolonged exposure |
| 401–500 | 🟤 Severe | Affects healthy people, serious impact on diseased |

---

## 🔄 Data Import

### Using the Seed Script

```bash
cd backend
python -m app.seed
```

The seed script will:
1. Create district entries with geospatial boundaries
2. Import all CSV files from `data/sample/`
3. Skip already-imported data to prevent duplicates

### Manual Import

Place your CSV files in the appropriate directory and ensure they match the column specifications above. The system will validate headers during import.

---

## ⚠️ Data Quality Notes

- All dates must be in **ISO 8601** format (`YYYY-MM-DD`)
- Numeric fields should use **decimal point** notation (not comma)
- Missing values should be represented as empty strings, not `NULL` or `NA`
- District codes must match the registered codes in the system
- CSV files must be **UTF-8** encoded
- Header row is **required** as the first line of every CSV file
