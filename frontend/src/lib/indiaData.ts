/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared India district data layer.
//
// Loads the bundled district polygons (public/india-districts.geojson) and
// enriches every district with plausible, DETERMINISTIC environmental metrics
// derived from geographic priors (latitude, coastline, the Indo-Gangetic
// plain, known metros). This lets the whole map render richly with zero
// backend and zero API keys. When the real backend/API is connected, the
// same component simply consumes the live GeoJSON instead.

export interface DistrictMetrics {
  id: number;
  name: string;
  state_name: string;
  temperature: number; // °C
  rainfall: number; // mm (recent)
  aqi: number; // Air Quality Index
  flood_risk: number; // 0..1
  population: number; // density /km²
  lat: number;
  lon: number;
}

export type EnrichedFeature = {
  type: 'Feature';
  properties: DistrictMetrics;
  geometry: any;
};

export type EnrichedGeoJSON = {
  type: 'FeatureCollection';
  features: EnrichedFeature[];
};

// Deterministic 0..1 hash from a string (FNV-1a).
function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const METROS: Record<string, number> = {
  Mumbai: 21000, 'Mumbai Suburban': 20900, Delhi: 11300, Kolkata: 24000,
  Chennai: 26900, Bengaluru: 4400, 'Bengaluru Urban': 12000, Hyderabad: 18500,
  Ahmadabad: 900, Ahmedabad: 900, Pune: 600, Surat: 1400, Kanpur: 1500,
  Jaipur: 600, Lucknow: 1800, Nagpur: 470, Patna: 1800, Bhopal: 850,
  Ludhiana: 970, Agra: 1100, Varanasi: 2400, Kozhikode: 2900, Thane: 1200,
};

// State-level flood propensity hints (major river basins / deltas / coasts).
const FLOOD_PRONE = new Set([
  'Assam', 'Bihar', 'West Bengal', 'Uttar Pradesh', 'Odisha', 'Kerala',
  'Andhra Pradesh', 'Meghalaya', 'Arunachal Pradesh', 'Manipur',
]);

// Compute the centroid of a feature's outer ring(s) (simple average).
function centroidOf(geometry: any): [number, number] {
  let sx = 0, sy = 0, n = 0;
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const poly of polys) {
    for (const [x, y] of poly[0]) { sx += x; sy += y; n++; }
  }
  return n ? [sx / n, sy / n] : [79, 22];
}

// Derive a plausible, stable set of metrics for one district.
function deriveMetrics(name: string, state: string, lat: number, lon: number): Omit<DistrictMetrics, 'id'> {
  const h1 = hash01(name + state);
  const h2 = hash01(state + name + '::2');
  const h3 = hash01(name + '::3');

  // --- Temperature: hotter at lower latitude, cooler in the far north / hills.
  let temperature = 34 - (lat - 8) * 0.62 + (h1 - 0.5) * 5;
  if (lat > 31) temperature -= 6; // Himalayan belt
  temperature = Math.max(4, Math.min(44, +temperature.toFixed(1)));

  // --- Rainfall: west coast, north-east and the Himalayan foothills are wet;
  //     the Thar desert (Rajasthan/Kutch) is dry.
  let rainfall = 6 + h2 * 22;
  const westCoast = lon >= 72 && lon <= 77 && lat >= 8 && lat <= 21;
  const northEast = lon > 89.5;
  const arid = lon >= 69 && lon <= 75 && lat >= 24 && lat <= 30;
  if (westCoast) rainfall += 55 + h3 * 40;
  if (northEast) rainfall += 60 + h3 * 45;
  if (state === 'Kerala' || state === 'Goa') rainfall += 30;
  if (arid) rainfall *= 0.28;
  rainfall = Math.max(0, Math.min(190, +rainfall.toFixed(1)));

  // --- AQI: the Indo-Gangetic plain (Punjab→Bihar) is the pollution hotspot.
  let aqi = 55 + h1 * 45;
  const indoGangetic = lat >= 24 && lat <= 31.5 && lon >= 74 && lon <= 88.5;
  if (indoGangetic) aqi += 120 + h2 * 90;
  if (METROS[name]) aqi += 45;
  if (state === 'Delhi') aqi += 60;
  aqi = Math.max(18, Math.min(390, Math.round(aqi)));

  // --- Flood risk: driven by rainfall + basin/coast propensity.
  let flood = rainfall / 190 * 0.5 + h3 * 0.25;
  if (FLOOD_PRONE.has(state)) flood += 0.25;
  if (northEast) flood += 0.15;
  flood = Math.max(0.03, Math.min(0.96, +flood.toFixed(2)));

  // --- Population density: metros are dense, deserts/hills sparse.
  let population = METROS[name];
  if (population === undefined) {
    population = 120 + h2 * 900;
    if (arid || lat > 31) population *= 0.4;
    if (indoGangetic) population *= 1.8;
    population = Math.round(population);
  }

  return { name, state_name: state, temperature, rainfall, aqi, flood_risk: flood, population, lat, lon };
}

let _cache: EnrichedGeoJSON | null = null;
let _inflight: Promise<EnrichedGeoJSON> | null = null;

// Fetch + enrich the bundled district geometry (cached across the session).
export async function loadIndiaDistricts(): Promise<EnrichedGeoJSON> {
  if (_cache) return _cache;
  if (_inflight) return _inflight;
  _inflight = fetch('/india-districts.geojson')
    .then((r) => r.json())
    .then((raw: any) => {
      const features: EnrichedFeature[] = raw.features.map((f: any, i: number) => {
        const name = f.properties.d ?? f.properties.name ?? `District ${i}`;
        const state = f.properties.s ?? f.properties.state_name ?? '';
        const [lon, lat] = centroidOf(f.geometry);
        return {
          type: 'Feature',
          properties: { id: i, ...deriveMetrics(name, state, lat != null ? lat : 22, lon != null ? lon : 79) },
          geometry: f.geometry,
        };
      });
      _cache = { type: 'FeatureCollection', features };
      return _cache;
    });
  return _inflight;
}

// ---------------------------------------------------------------------------
// Colour scale helpers
// ---------------------------------------------------------------------------
export const METRIC_DOMAIN: Record<string, [number, number]> = {
  temperature: [6, 42],
  rainfall: [0, 150],
  flood_risk: [0, 1],
  aqi: [0, 350],
  population: [0, 22000],
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Interpolate a value across a multi-stop colour scale.
export function colorForValue(value: number, scale: string[], domain: [number, number]): string {
  const [min, max] = domain;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const seg = t * (scale.length - 1);
  const i = Math.min(scale.length - 2, Math.floor(seg));
  const f = seg - i;
  const [r1, g1, b1] = hexToRgb(scale[i]);
  const [r2, g2, b2] = hexToRgb(scale[i + 1]);
  const r = Math.round(r1 + (r2 - r1) * f);
  const g = Math.round(g1 + (g2 - g1) * f);
  const b = Math.round(b1 + (b2 - b1) * f);
  return `rgb(${r},${g},${b})`;
}
