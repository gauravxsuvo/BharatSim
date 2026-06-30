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
| Interactive Mapping | District level visualization powered by Mapbox GL JS |
| Simulation Engine | Modular architecture supporting custom simulation parameters |
| Predictive Analytics | Machine learning models for forecasting environmental metrics |
| AI Assistant | Context aware assistant to interpret simulation results |
| Data Dashboard | Time series analysis and heatmap visualizations |

## Technology Stack

The project relies on a robust stack of open source technologies.

| Component | Technologies |
|---|---|
| Frontend | Next.js, TypeScript, Mapbox GL JS, Recharts |
| Backend | FastAPI, Python, Celery |
| Database | PostgreSQL, PostGIS, Redis |
| Machine Learning | PyTorch, XGBoost, LightGBM, Scikit-learn |

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

2. Start the infrastructure services:
   ```bash
   docker-compose up -d
   ```

3. Configure the backend:
   ```bash
   cd backend
   pip install -e .
   python -m app.seed
   uvicorn app.main:app --reload
   ```

4. Configure the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Configure environment variables:
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

6. Access the application by navigating to `http://localhost:3000` in your web browser.
## Project Structure

* `/backend` : Contains the FastAPI application, simulation modules, and machine learning models.
* `/frontend` : Contains the Next.js web application and UI components.
* `/data` : Stores sample datasets and database initialization scripts.

## License

This project is licensed under the MIT License
