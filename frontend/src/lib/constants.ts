import { Waves, Thermometer, Wheat, Factory } from 'lucide-react';

export const INDIA_CENTER: [number, number] = [78.9629, 20.5937];
export const DEFAULT_ZOOM = 4.5;

export const SIMULATION_TYPES = [
  {
    id: 'flood',
    label: 'Flood Risk',
    number: '01',
    icon: Waves,
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
    number: '02',
    icon: Thermometer,
    description: 'Assess heatwave risk using temperature, humidity, and urban factors',
    params: [
      { key: 'temperature_offset', label: 'Temperature Offset (°C)', min: -5, max: 10, step: 0.5, default: 0 },
      { key: 'humidity_factor', label: 'Humidity Factor', min: 0.5, max: 2, step: 0.1, default: 1.0 },
      { key: 'urban_heat_island', label: 'Urban Heat Island (°C)', min: 0, max: 5, step: 0.5, default: 2.0 },
      { key: 'duration_days', label: 'Duration (days)', min: 1, max: 14, step: 1, default: 3 },
    ],
  },
  {
    id: 'crop_yield',
    label: 'Crop Yield',
    number: '03',
    icon: Wheat,
    description: 'Estimate crop yield changes based on weather and agricultural inputs',
    params: [
      { key: 'rainfall_change_pct', label: 'Rainfall Change (%)', min: -50, max: 100, step: 5, default: 0 },
      { key: 'temperature_change', label: 'Temperature Change (°C)', min: -3, max: 5, step: 0.5, default: 0 },
      { key: 'irrigation_coverage', label: 'Irrigation Coverage', min: 0, max: 1, step: 0.05, default: 0.5 },
      { key: 'fertilizer_index', label: 'Fertilizer Index', min: 0.5, max: 2, step: 0.1, default: 1.0 },
    ],
  },
  {
    id: 'air_quality',
    label: 'Air Quality',
    number: '04',
    icon: Factory,
    description: 'Model air quality index based on emissions and meteorological conditions',
    params: [
      { key: 'emission_factor', label: 'Emission Factor', min: 0.5, max: 3, step: 0.1, default: 1.0 },
      { key: 'wind_speed_factor', label: 'Wind Speed Factor', min: 0.5, max: 3, step: 0.1, default: 1.0 },
      { key: 'industrial_activity', label: 'Industrial Activity', min: 0.5, max: 3, step: 0.1, default: 1.0 },
      { key: 'vehicle_density_factor', label: 'Vehicle Density Factor', min: 0.5, max: 3, step: 0.1, default: 1.0 },
    ],
  },
];

// Grayscale value ramp — no hue anywhere. Kept as literal hex (not CSS
// var references): colorForValue()/interpolateColor() parse these with
// parseInt(hex, 16), which silently breaks on a var() string.
const GRAYSCALE_SCALE = ['#F5F5F5', '#BFBFBF', '#737373', '#171717'];

export const METRICS = [
  { id: 'temperature', label: 'Temperature', unit: '°C', colorScale: GRAYSCALE_SCALE },
  { id: 'rainfall', label: 'Rainfall', unit: 'mm', colorScale: GRAYSCALE_SCALE },
  { id: 'flood_risk', label: 'Flood Risk', unit: '', colorScale: GRAYSCALE_SCALE },
  { id: 'aqi', label: 'Air Quality', unit: 'AQI', colorScale: GRAYSCALE_SCALE },
  { id: 'population', label: 'Population Density', unit: '/km²', colorScale: GRAYSCALE_SCALE },
];

// Severity is encoded by value (lightness) + weight, never hue. Each fill
// is paired with the text color that keeps it above WCAG AA (4.5:1).
export const SEVERITY_COLORS: Record<string, string> = {
  low: '#E5E5E5',
  medium: '#A3A3A3',
  high: '#525252',
  severe: '#262626',
  critical: '#000000',
};

export const SEVERITY_TEXT_COLORS: Record<string, string> = {
  low: '#000000',
  medium: '#000000',
  high: '#FFFFFF',
  severe: '#FFFFFF',
  critical: '#FFFFFF',
};
