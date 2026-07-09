import {
  District,
  DistrictGeoJSON,
  DistrictListResponse,
  DashboardStats,
  HeatmapDataPoint,
  TimeSeriesPoint,
  SimulationParams,
  SimulationRun,
  SimulationComparison,
  ModelListResponse,
  ChatResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }
  return res.json();
}

export const api = {
  districts: {
    list: (state?: string) =>
      fetchAPI<DistrictListResponse>(`/api/districts/${state ? `?state=${state}` : ''}`),
    geojson: () => fetchAPI<DistrictGeoJSON>('/api/districts/geojson'),
    get: (id: number) => fetchAPI<District>(`/api/districts/${id}`),
  },
  dashboard: {
    heatmap: (metric: string) =>
      fetchAPI<HeatmapDataPoint[]>(`/api/dashboard/heatmap?metric=${metric}`),
    timeseries: (districtId: number, metric: string, dateFrom: string, dateTo: string) =>
      fetchAPI<TimeSeriesPoint[]>(
        `/api/dashboard/timeseries?district_id=${districtId}&metric=${metric}&date_from=${dateFrom}&date_to=${dateTo}`
      ),
    stats: () => fetchAPI<DashboardStats>('/api/dashboard/stats'),
  },
  simulations: {
    run: (params: SimulationParams) =>
      fetchAPI<SimulationRun>('/api/simulations/', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    list: () => fetchAPI<SimulationRun[]>('/api/simulations/'),
    get: (id: number) => fetchAPI<SimulationRun>(`/api/simulations/${id}`),
    compare: (ids: number[]) =>
      fetchAPI<SimulationComparison>('/api/simulations/compare', {
        method: 'POST',
        body: JSON.stringify({ simulation_ids: ids }),
      }),
  },
  models: {
    list: () => fetchAPI<ModelListResponse>('/api/models/'),
  },
  assistant: {
    chat: (message: string, context?: Record<string, unknown>) =>
      fetchAPI<ChatResponse>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message, context }),
      }),
  },
};
