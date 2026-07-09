export interface District {
  id: number;
  name: string;
  state_name: string;
  state_code: string;
  district_code: string;
  area_sq_km: number;
  centroid_lat: number;
  centroid_lon: number;
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: unknown;
}

export interface DistrictGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: {
      id: number;
      name: string;
      state_name: string;
    };
    geometry: GeoJSONGeometry;
  }>;
}

export interface WeatherObservation {
  id: number;
  district_id: number;
  date: string;
  temperature_max: number;
  temperature_min: number;
  temperature_avg: number;
  humidity: number;
  rainfall_mm: number;
  wind_speed: number;
  pressure: number;
}

export interface RiverObservation {
  id: number;
  district_id: number;
  river_name: string;
  date: string;
  water_level_m: number;
  discharge_cumecs: number;
  flood_status: string;
}

export interface PopulationData {
  id: number;
  district_id: number;
  year: number;
  total_population: number;
  density_per_sq_km: number;
  urban_population: number;
  rural_population: number;
  literacy_rate: number;
}

export interface DistrictListResponse {
  districts: District[];
  total: number;
}

export interface SimulationParams {
  simulation_type: string;
  name: string;
  description?: string;
  district_ids: number[];
  date_range_start: string;
  date_range_end: string;
  parameters: Record<string, number>;
}

export interface SimulationRun {
  id: number;
  simulation_type: string;
  name: string;
  status: string;
  parameters: string;
  created_at: string;
  completed_at: string | null;
  results: SimulationResult[];
}

export interface SimulationResult {
  id: number;
  district_id: number;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  confidence: number;
  severity_level: string;
}

export interface DashboardStats {
  total_districts: number;
  total_weather_records: number;
  total_river_records: number;
  total_simulations: number;
  latest_data_date: string | null;
}

export interface HeatmapDataPoint {
  district_id: number;
  district_name: string;
  lat: number;
  lon: number;
  value: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface MLModel {
  id: number;
  model_type: string;
  algorithm: string;
  version: string;
  accuracy: number | null;
  is_active: boolean;
}

export interface ModelListResponse {
  models: MLModel[];
  total: number;
}

export interface ChatSource {
  type: string;
  id: number;
  description: string;
}

export interface ChatResponse {
  message: string;
  sources: ChatSource[];
}

export interface SimulationComparison {
  simulations: Array<{
    id: number;
    name: string;
    simulation_type: string;
    status: string;
    created_at: string | null;
    results: SimulationResult[];
  }>;
  metrics: string[];
  districts: number[];
}
