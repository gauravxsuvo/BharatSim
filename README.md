# BharatSim

BharatSim is an AI powered digital twin of India designed for environmental and climate simulations. It provides an interactive simulation platform that integrates district level datasets, machine learning driven predictions, and a modular engine for visualizing various environmental impacts across the country.

## Architecture

The system follows a modern decoupled architecture, separating the client facing visualization layer from the computationally intensive simulation and data processing backend.

```mermaid
graph TD
    A[Frontend Client] -->|REST API| B[FastAPI Backend]
    B --> C[Simulation Engine]
    B --> D[Machine Learning Models]
    B --> E[(PostgreSQL + PostGIS)]
    C --> D
    E --> C
```

## Features

The application supports multiple core functionalities aimed at providing comprehensive environmental insights.

| Feature | Description |
|---|---|
| Interactive Mapping | District level visualization powered by Mapbox GL JS with choropleth layers |
| Simulation Engine | Modular architecture supporting custom simulation parameters (e.g. adjusting rainfall multipliers or temperature offsets) |
| Predictive Analytics | Machine learning models forecasting Flood Risk, Heatwaves, Crop Yields, and Air Quality |
| AI Assistant | Context aware chatbot to interpret simulation results and explain environmental trends |
| Data Dashboard | Interactive time series analysis and heatmap visualizations of environmental metrics |
| Graceful Fallback | UI gracefully falls back to generated demo data if the backend server is unreachable |

## Machine Learning Models

BharatSim includes 4 core predictive models built using modern ML frameworks:
1. **Flood Risk Model**: Predicts the likelihood of floods based on rainfall, river levels, and soil saturation (XGBoost).
2. **Heatwave Predictor**: Assesses heatwave severity using temperature, humidity, and urban heat island effects (LightGBM).
3. **Crop Yield Estimator**: Estimates agricultural yield changes based on weather fluctuations and irrigation (Scikit-learn).
4. **Air Quality Index**: Models AQI based on emissions, wind speed, and industrial activity (PyTorch).

## Technology Stack

The project relies on a robust stack of open source technologies.

| Component | Technologies |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Mapbox GL JS, Recharts, Vanilla CSS (Glassmorphism) |
| Backend | FastAPI, Python 3.11, SQLAlchemy, GeoAlchemy2 |
| Database | PostgreSQL, PostGIS, Redis |
| Machine Learning | PyTorch, XGBoost, LightGBM, Scikit-learn, Pandas, GeoPandas |

## Getting Started

### Prerequisites

Please ensure the following dependencies are installed on your system:
* Node.js version 18 or higher
* Python version 3.11 or higher
* Docker and Docker Compose

### Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/gauravxsuvo/BharatSim.git
   cd BharatSim
   ```

2. Start the infrastructure services (PostgreSQL/PostGIS & Redis):
   ```bash
   docker-compose up -d
   ```

3. Configure environment variables:
   Create a `.env` file in the `backend` directory:
   ```env
   DATABASE_URL=postgresql+asyncpg://bharatsim:bharatsim@localhost:5432/bharatsim
   REDIS_URL=redis://localhost:6379/0
   OPENAI_API_KEY=your_openai_api_key
   ```
   
   Create a `.env.local` file in the `frontend` directory:
   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Configure the backend and seed the database:
   ```bash
   cd backend
   pip install -e .
   python -m app.seed
   uvicorn app.main:app --reload
   ```

5. Configure and run the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. Access the application by navigating to `http://localhost:3000` in your web browser.

## Project Structure

* `/backend` : Contains the FastAPI application, simulation modules, and machine learning pipelines.
* `/frontend` : Contains the Next.js web application, Mapbox components, and dashboard logic.
* `/data` : Stores sample datasets, GeoJSON definitions, and database initialization scripts.

## License

This project is licensed under the MIT License.
