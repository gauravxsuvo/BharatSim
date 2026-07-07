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
      fetchAPI<any[]>(`/api/districts${state ? `?state=${state}` : ''}`),
    geojson: () => fetchAPI<any>('/api/districts/geojson'),
    get: (id: number) => fetchAPI<any>(`/api/districts/${id}`),
  },
  dashboard: {
    heatmap: (metric: string) =>
      fetchAPI<any[]>(`/api/dashboard/heatmap?metric=${metric}`),
    timeseries: (districtId: number, metric: string, dateFrom: string, dateTo: string) =>
      fetchAPI<any[]>(
        `/api/dashboard/timeseries?district_id=${districtId}&metric=${metric}&date_from=${dateFrom}&date_to=${dateTo}`
      ),
    stats: () => fetchAPI<any>('/api/dashboard/stats'),
  },
  simulations: {
    run: (params: any) =>
      fetchAPI<any>('/api/simulations', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    list: () => fetchAPI<any[]>('/api/simulations'),
    get: (id: number) => fetchAPI<any>(`/api/simulations/${id}`),
    compare: (ids: number[]) =>
      fetchAPI<any>('/api/simulations/compare', {
        method: 'POST',
        body: JSON.stringify({ simulation_ids: ids }),
      }),
  },
  models: {
    list: () => fetchAPI<any[]>('/api/models'),
  },
  assistant: {
    chat: (message: string, context?: any) =>
      fetchAPI<any>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message, context }),
      }),
  },
};
