# 🇮🇳 BharatSim

**BharatSim** is an AI-powered digital twin of India for environmental and climate simulations. It provides an interactive simulation platform with district-level datasets, ML-driven predictions, and a modular engine for visualizing environmental impacts.

## ✨ Features

- **Interactive India Map**: Explore district-level data with an interactive Mapbox-powered visualization.
- **District-Level Datasets**: Access weather, river, population, and satellite data at the district level.
- **Simulation Engine**: Run simulations for Flood Risk, Heatwaves, Crop Yield, and Air Quality using predictive models.
- **AI Assistant**: Interact with an AI assistant that can answer questions about simulation results and environmental trends.
- **Dashboard**: View heatmaps and time-series graphs of environmental metrics.

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, TypeScript, Mapbox GL JS, Recharts, Vanilla CSS (Dark Glassmorphism UI)
- **Backend**: FastAPI, Python, PostgreSQL, PostGIS
- **AI & ML**: PyTorch, XGBoost, LightGBM, Scikit-learn
- **Infrastructure**: Docker, Redis, Celery

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (for PostgreSQL + PostGIS + Redis)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gauravxsuvo/BharatSim.git
   cd BharatSim
   ```

2. **Start Infrastructure (Database & Redis):**
   ```bash
   docker-compose up -d
   ```

3. **Backend Setup:**
   ```bash
   cd backend
   pip install -e .
   python -m app.seed
   uvicorn app.main:app --reload
   ```

4. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

## 📂 Project Structure

```
BharatSim/
├── backend/               # FastAPI backend, ML models, and Simulation Engine
├── frontend/              # Next.js web application
├── data/                  # Sample datasets and SQL init scripts
└── docker-compose.yml     # Infrastructure services
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is licensed under the MIT License.
