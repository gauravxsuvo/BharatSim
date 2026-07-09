# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BharatSim is an interactive platform for environmental/climate simulation across India's 759 districts (flood risk, heatwave, crop yield, air quality). Two independently runnable halves talking over REST:

- `frontend/` — Next.js (App Router) + TypeScript. Ships with an offline vector map and sample data; runs with **no backend at all**.
- `backend/` — FastAPI + SQLAlchemy (async). Serves district data, runs the simulation engine, exposes the REST API.
- `data/` — sample CSVs, `init.sql` (PostGIS init), and dataset docs.

The core design principle: **every feature has a sample/demo mode and a live mode, toggled purely by env vars, with no code changes required.** See the table in `README.md` under "Data and API modes". When touching config-gated features (map tiles, assistant, weather), preserve this fallback behavior — don't make live credentials required.

## Commands

### Frontend (`frontend/`)
```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint      # eslint
```

### Backend (`backend/`) — SQLite mode, no Docker (default/recommended)
```bash
python -m venv venv
.\venv\Scripts\activate                  # Windows; source venv/bin/activate on macOS/Linux
pip install -r requirements-lite.txt      # lightweight: no torch/xgboost/lightgbm/geopandas
python -m app.seed                        # loads sample data into SQLite (backend/bharatsim.db)
uvicorn app.main:app --reload             # http://localhost:8000, docs at /docs
```

### Backend — full stack (PostgreSQL + PostGIS + ML libs)
```bash
docker-compose up -d      # postgres (PostGIS) + redis
pip install -e .          # full deps including torch/xgboost/lightgbm/geopandas
# then in backend/.env switch DATABASE_URL to the postgres URL (commented example provided)
python -m app.seed
uvicorn app.main:app --reload
```

### Backend tests
```bash
cd backend
pytest
pytest tests/test_simulations.py          # single file
pytest tests/test_simulations.py -k name  # single test
```
Tests run against an in-memory SQLite engine (`tests/conftest.py`), independent of whatever `DATABASE_URL` is set to. PostGIS-specific spatial queries are not exercised under SQLite.

## Backend architecture

**SQLite vs PostgreSQL dual-mode is load-bearing, not incidental.** `app/config.py` reads `DATABASE_URL`; `app/geo.py` exposes `IS_SQLITE` derived from that URL and provides `storage_from_wkt` / `storage_from_geojson` / `geojson_from_storage` helpers that convert geometry to/from either a PostGIS `Geometry` column or plain WKT text in a `Text` column. Models that store geometry (e.g. `app/models/district.py`) branch on `IS_SQLITE` to pick the column type and whether to declare the GiST index — never assume PostGIS is present when touching geometry code.

**Simulation engine (`app/simulation/`)** is a self-registering plugin system:
- `base.py` defines `BaseSimulator` (abstract: `parameter_schema`, `validate_params`, `load_data`, `run`) and `SimulationResult`.
- `registry.py`'s `SimulatorRegistry` holds a `simulation_type -> class` map. Modules register via `@SimulatorRegistry.register` at import time; `modules/__init__.py` is lazily auto-imported on first `SimulatorRegistry.get()`/`list_all()` call.
- `modules/{flood,heatwave,crop_yield,air_quality}.py` are the four concrete simulators, each loading its own observational data (rainfall, river levels, temperature, NDVI, emissions, etc.) and returning per-district results with a severity level.
- `runner.py` (`SimulationRunner`) drives a simulator end-to-end for `simulation_service.py`, which persists `SimulationRun`/`SimulationResult` rows and exposes create/get/compare operations.
- Adding a new simulation type means: create a module implementing `BaseSimulator`, decorate it with `@SimulatorRegistry.register`, and import it from `modules/__init__.py` — no router or service changes needed.

**ML layer (`app/ml/`, `app/services/ml_service.py`)** is a separate, adjacent concern from the simulation engine: `MODEL_TRAINERS` maps model type (`flood`, `heatwave`, `crop_yield`, `air_quality`) to a trainer class (XGBoost/LightGBM/sklearn/PyTorch backed). `ml_service.train_model` loads training data from the DB, trains, serializes to `ML_MODELS_DIR`, and records an `MLModel` row; only one model per type is `is_active` at a time. This is currently independent of the simulation modules above (simulations use domain formulas, not trained models, by default) — the ML predictors exist to eventually back simulation domains once trained models are supplied.

**Live vs sample data**: `app/services/live_data.py` hits the keyless Open-Meteo archive API when `USE_LIVE_DATA=true` or `OPENWEATHER_API_KEY` is set (checked via `settings.live_weather_enabled`); any failure returns `None` so callers (the seed script) transparently fall back to the bundled CSVs in `data/sample/`. Follow this same best-effort/fallback pattern for any new live-data integration.

**Routers → services split**: routers in `app/routers/` (`districts`, `datasets`, `simulations`, `models`, `dashboard`, `assistant`) are thin; business logic lives in `app/services/*_service.py`. All routes are mounted under `/api/*` in `app/main.py`.

**Config**: `app/config.py` is a single pydantic-settings `Settings` object reading `backend/.env` (see that file for the full annotated list of sample-vs-live toggles: `DATABASE_URL`, `OPENAI_API_KEY`, `USE_LIVE_DATA`/`OPENWEATHER_API_KEY`, `MAPBOX_TOKEN`, `ML_MODELS_DIR`, `CORS_ORIGINS`).

**`CORS_ORIGINS` is deliberately typed `str`, not `list[str]`.** pydantic-settings parses env vars for a `list[str]` field as strict JSON and hard-fails startup on anything else — but dashboards like Render's store env vars as plain text, so a value like `https://foo.vercel.app` (no brackets/quotes) would crash the app rather than just failing to match. `settings.cors_origins_list` parses either JSON-array or comma-separated form; use that property, never `settings.CORS_ORIGINS` directly, when passing origins to `CORSMiddleware`. Separately, `app/main.py` also sets `allow_origin_regex=r"https://.*\.vercel\.app"` so any Vercel preview/production origin works even if `CORS_ORIGINS` was never updated after a frontend redeploy — don't remove this without giving deploys another way to stay in sync, since forgetting to update `CORS_ORIGINS` after connecting a new frontend URL is exactly what breaks simulations in production (manifests as `OPTIONS ... 400 Bad Request` in the Render logs).

**Migrations**: Alembic is set up (`backend/alembic/`), but `app/database.py`'s `init_db()` currently just does `Base.metadata.create_all(checkfirst=True)` on startup for dev bootstrapping — use Alembic migrations for anything production-bound.

## Frontend architecture

- `src/app/` — route pages: `/` (map/home), `/dashboard`, `/simulation`, `/assistant`.
- `src/components/{map,dashboard,simulation,assistant,ui}/` — feature-grouped components (e.g. `map/IndiaChoropleth.tsx`, `map/IndiaMap.tsx` for the offline vector map vs. Mapbox GL upgrade path).
- `src/hooks/` — data-fetching hooks (`useDashboard`, `useMapData`, `useSimulation`) wrapping `src/lib/api.ts`. **Not currently wired into any page** — Dashboard/Simulation/Assistant each call `fetch`/`loadIndiaDistricts` inline with their own demo-data fallback instead. Don't assume editing a hook affects the UI; grep for actual usage first.
- `src/lib/api.ts` — single `api` object with typed methods per backend resource (`districts`, `dashboard`, `simulations`, `models`, `assistant`); all requests go through one `fetchAPI` helper hitting `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`). Add new backend endpoints here rather than calling `fetch` ad hoc from components.
- `src/lib/constants.ts` — the four simulation types and their tunable parameter schemas (`SIMULATION_TYPES`), dashboard `METRICS`, and `SEVERITY_COLORS`. This is the frontend's mirror of each simulator's `parameter_schema` on the backend — keep them in sync when a simulation module's parameters change.
- Map basemap and AI assistant both have hardcoded/offline fallbacks and upgrade to live services purely based on env vars (`NEXT_PUBLIC_MAPBOX_TOKEN`, backend's `OPENAI_API_KEY`) — see README's mode table.

### `globals.css` cascade layers — do not add unlayered rules
Every custom rule in `src/app/globals.css` lives inside `@layer base` or `@layer components`. This is load-bearing, not stylistic: per the CSS cascade-layers spec, styles written *outside* any `@layer` always win over *any* `@layer` content — including Tailwind's own utilities — regardless of specificity or source order. A bare `h1 { font-size: ... }` added outside a layer would silently defeat every `text-*`/`md:text-*` class applied to an `<h1>` anywhere in the app (this exact bug shipped for a while — headings/paragraphs across the site were stuck at one size no matter what Tailwind class was written on them). When adding any bare element-selector or `.class` rule to this file, put it inside the appropriate `@layer` block, or a plain Tailwind utility applied in JSX will mysteriously do nothing.

### Full-bleed vs. padded pages
`.main-content` (in `layout.tsx`) carries no padding of its own — only `margin-left` for the fixed sidebar. Pages that want the standard padded look add the `page-shell` class to their root element (see `dashboard/page.tsx`, `simulation/page.tsx`). Pages that need to fill the viewport edge-to-edge (`/` map, `/assistant` chat) skip `page-shell` and size themselves with `h-dvh` instead. Don't reintroduce manual `margin: -32px` / `calc(100vh - 64px)` full-bleed hacks on a page — they assumed padding/header values that drift out of sync with the mobile breakpoint and were a real source of horizontal overflow on phones.

### Important: non-standard Next.js version
`frontend/AGENTS.md` (loaded as `frontend/CLAUDE.md`) flags that this project's Next.js version has breaking changes vs. training data — **check `node_modules/next/dist/docs/` for the relevant guide before writing Next.js code**, and heed deprecation notices. Package versions of note: Next.js 16.2.9, React 19.2.4, Tailwind 4.
