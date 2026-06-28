export const INDIA_CENTER: [number, number] = [78.9629, 20.5937];
export const DEFAULT_ZOOM = 4.5;

export const SIMULATION_TYPES = [
  {
    id: 'flood',
    label: 'Flood Risk',
    icon: '\uD83C\uDF0A',
    color: '#3b82f6',
    description: 'Predict flood risk based on rainfall, river levels, and soil conditions',
    params: [
      { key: 'rainfall_multiplier', label: 'Rainfall Multiplier', min: 0.5, max: 5, step: 0.1, default: 1.0 },
      { key: 'soil_saturation', label: 'Soil Saturation', min: 0, max: 1, step: 0.05, default: 0.5 },
      { key: 'river_level_offset', label: 'River Level Offset (m)', min: -2, max: 5, step: 0.5, default: 0 },
      { key: 'return_period_years', label: 'Return Period (years)', min: 10, max: 500, step: 10, default: 100 },
    ],
  },
  {
    id: 'heatwave',
    label: 'Heatwave',
    icon: '\uD83C\uDF21\uFE0F',
    color: '#ef4444',
    description: 'Assess heatwave risk using temperature, humidity, and urban factors',
    params: [
      { key: 'temperature_offset', label: 'Temperature Offset (\u00b0C)', min: -5, max: 10, step: 0.5, default: 0 },
      { key: 'humidity_factor', label: 'Humidity Factor', min: 0.5, max: 2, step: 0.1, default: 1.0 },
      { key: 'urban_heat_island', label: 'Urban Heat Island (\u00b0C)', min: 0, max: 5, step: 0.5, default: 2.0 },
      { key: 'duration_days', label: 'Duration (days)', min: 1, max: 14, step: 1, default: 3 },
    ],
  },
  {
    id: 'crop_yield',
    label: 'Crop Yield',
    icon: '\uD83C\uDF3E',
    color: '#22c55e',
    description: 'Estimate crop yield changes based on weather and agricultural inputs',
    params: [
      { key: 'rainfall_change_pct', label: 'Rainfall Change (%)', min: -50, max: 100, step: 5, default: 0 },
      { key: 'temperature_change', label: 'Temperature Change (\u00b0C)', min: -3, max: 5, step: 0.5, default: 0 },
      { key: 'irrigation_coverage', label: 'Irrigation Coverage', min: 0, max: 1, step: 0.05, default: 0.5 },
      { key: 'fertilizer_index', label: 'Fertilizer Index', min: 0.5, max: 2, step: 0.1, default: 1.0 },
    ],
  },
  {
    id: 'air_quality',
    label: 'Air Quality',
    icon: '\uD83C\uDF2B\uFE0F',
    color: '#f59e0b',
    description: 'Model air quality index based on emissions and meteorological conditions',
    params: [
      { key: 'emission_factor', label: 'Emission Factor', min: 0.5, max: 3, step: 0.1, default: 1.0 },
      { key: 'wind_speed_factor', label: 'Wind Speed Factor', min: 0.5, max: 3, step: 0.1, default: 1.0 },
      { key: 'industrial_activity', label: 'Industrial Activity', min: 0.5, max: 3, step: 0.1, default: 1.0 },
      { key: 'vehicle_density_factor', label: 'Vehicle Density Factor', min: 0.5, max: 3, step: 0.1, default: 1.0 },
    ],
  },
];

export const METRICS = [
  { id: 'temperature', label: 'Temperature', unit: '\u00b0C', colorScale: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'] },
  { id: 'rainfall', label: 'Rainfall', unit: 'mm', colorScale: ['#dbeafe', '#60a5fa', '#2563eb', '#1e3a8a'] },
  { id: 'flood_risk', label: 'Flood Risk', unit: '', colorScale: ['#22c55e', '#f59e0b', '#ef4444', '#991b1b'] },
  { id: 'aqi', label: 'Air Quality', unit: 'AQI', colorScale: ['#22c55e', '#f59e0b', '#ef4444', '#7f1d1d'] },
  { id: 'population', label: 'Population Density', unit: '/km\u00b2', colorScale: ['#ddd6fe', '#a78bfa', '#7c3aed', '#4c1d95'] },
];

export const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  severe: '#ef4444',
  critical: '#991b1b',
};
