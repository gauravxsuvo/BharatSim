/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
// @ts-expect-error - react-map-gl types may not resolve during CI; works at runtime
import Map, { Source, Layer, NavigationControl, ScaleControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { INDIA_CENTER, DEFAULT_ZOOM, METRICS } from '@/lib/constants';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

function makePolygon(lng1: number, lat1: number, lng2: number, lat2: number): any {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[lng1, lat1], [lng2, lat1], [lng2, lat2], [lng1, lat2], [lng1, lat1]]],
    },
  };
}

const DEMO_FEATURES = [
  { id: 1, name: 'Mumbai', state_name: 'Maharashtra', temperature: 29, rainfall: 45, aqi: 145, flood_risk: 0.3, population: 20000, lng1: 72.7, lat1: 18.8, lng2: 73.1, lat2: 19.3 },
  { id: 2, name: 'Pune', state_name: 'Maharashtra', temperature: 24, rainfall: 20, aqi: 90, flood_risk: 0.15, population: 600, lng1: 73.6, lat1: 18.3, lng2: 74.1, lat2: 18.7 },
  { id: 3, name: 'Chennai', state_name: 'Tamil Nadu', temperature: 28, rainfall: 35, aqi: 110, flood_risk: 0.4, population: 27000, lng1: 80.0, lat1: 12.8, lng2: 80.4, lat2: 13.2 },
  { id: 4, name: 'Coimbatore', state_name: 'Tamil Nadu', temperature: 26, rainfall: 18, aqi: 75, flood_risk: 0.1, population: 500, lng1: 76.7, lat1: 10.8, lng2: 77.2, lat2: 11.2 },
  { id: 5, name: 'Lucknow', state_name: 'Uttar Pradesh', temperature: 18, rainfall: 5, aqi: 280, flood_risk: 0.25, population: 1800, lng1: 80.7, lat1: 26.6, lng2: 81.1, lat2: 27.0 },
  { id: 6, name: 'Varanasi', state_name: 'Uttar Pradesh', temperature: 17, rainfall: 4, aqi: 310, flood_risk: 0.5, population: 2400, lng1: 82.8, lat1: 25.1, lng2: 83.2, lat2: 25.5 },
  { id: 7, name: 'Jaipur', state_name: 'Rajasthan', temperature: 17, rainfall: 2, aqi: 190, flood_risk: 0.08, population: 600, lng1: 75.5, lat1: 26.7, lng2: 76.0, lat2: 27.1 },
  { id: 8, name: 'Jodhpur', state_name: 'Rajasthan', temperature: 19, rainfall: 1, aqi: 220, flood_risk: 0.05, population: 160, lng1: 72.8, lat1: 26.1, lng2: 73.3, lat2: 26.5 },
  { id: 9, name: 'Kolkata', state_name: 'West Bengal', temperature: 20, rainfall: 30, aqi: 165, flood_risk: 0.55, population: 24000, lng1: 88.1, lat1: 22.3, lng2: 88.5, lat2: 22.7 },
  { id: 10, name: 'Darjeeling', state_name: 'West Bengal', temperature: 8, rainfall: 15, aqi: 55, flood_risk: 0.12, population: 580, lng1: 88.0, lat1: 26.9, lng2: 88.4, lat2: 27.3 },
];

const DEMO_GEOJSON = {
  type: 'FeatureCollection',
  features: DEMO_FEATURES.map(f => ({
    ...makePolygon(f.lng1, f.lat1, f.lng2, f.lat2),
    properties: { id: f.id, name: f.name, state_name: f.state_name, temperature: f.temperature, rainfall: f.rainfall, aqi: f.aqi, flood_risk: f.flood_risk, population: f.population },
  })),
};

function getColorExpression(metric: string): any {
  const expressions: Record<string, any> = {
    temperature: ['interpolate', ['linear'], ['get', 'temperature'], 5, '#3b82f6', 20, '#22c55e', 30, '#f59e0b', 40, '#ef4444'],
    rainfall:    ['interpolate', ['linear'], ['get', 'rainfall'],    0, '#dbeafe', 20, '#60a5fa', 50, '#2563eb', 100, '#1e3a8a'],
    flood_risk:  ['interpolate', ['linear'], ['get', 'flood_risk'],  0, '#22c55e', 0.3, '#f59e0b', 0.6, '#ef4444', 1, '#991b1b'],
    aqi:         ['interpolate', ['linear'], ['get', 'aqi'],         0, '#22c55e', 100, '#f59e0b', 200, '#ef4444', 300, '#7f1d1d'],
    population:  ['interpolate', ['linear'], ['get', 'population'],  0, '#ddd6fe', 5000, '#a78bfa', 15000, '#7c3aed', 25000, '#4c1d95'],
  };
  return expressions[metric] || expressions.temperature;
}

export default function IndiaMap({
  selectedMetric,
  onDistrictClick,
}: {
  selectedMetric: string;
  onDistrictClick: (district: any) => void;
}) {
  const mapRef = useRef<any>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [geojson, setGeojson] = useState<any>(DEMO_GEOJSON);

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/districts/geojson')
      .then(r => r.json())
      .then(data => { if (data?.features?.length) setGeojson(data); })
      .catch(() => {/* keep demo data */});
  }, []);

  const onMouseMove = useCallback((e: any) => {
    const features = e.features;
    if (features && features.length > 0) {
      const props = features[0].properties || {};
      setHoveredId(props.id);
      const metricLabel = METRICS.find(m => m.id === selectedMetric)?.label || selectedMetric;
      const val = props[selectedMetric] !== undefined ? props[selectedMetric] : 'N/A';
      setTooltip({ x: e.point.x, y: e.point.y, text: `${props.name}, ${props.state_name} — ${metricLabel}: ${val}` });
    } else {
      setHoveredId(null);
      setTooltip(null);
    }
  }, [selectedMetric]);

  const onMouseLeave = useCallback(() => {
    setHoveredId(null);
    setTooltip(null);
  }, []);

  const onClick = useCallback((e: any) => {
    if (e.features && e.features.length > 0) {
      onDistrictClick(e.features[0].properties);
      mapRef.current?.flyTo({ center: [e.lngLat.lng, e.lngLat.lat], zoom: 7, duration: 1200 });
    }
  }, [onDistrictClick]);

  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('placeholder')) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0a0f1c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: '3rem' }}>🗺️</div>
        <h2 style={{ color: 'var(--accent-primary)' }}>Mapbox Token Required</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 420, lineHeight: 1.6 }}>
          Add your Mapbox public token to <code>frontend/.env.local</code>:<br />
          <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here</code><br /><br />
          Get a free token at <strong>mapbox.com</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: INDIA_CENTER[0], latitude: INDIA_CENTER[1], zoom: DEFAULT_ZOOM }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        interactiveLayerIds={['districts-fill']}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" />
        <Source id="districts" type="geojson" data={geojson}>
          <Layer
            id="districts-fill"
            type="fill"
            paint={{
              'fill-color': getColorExpression(selectedMetric),
              'fill-opacity': ['case', ['==', ['get', 'id'], hoveredId ?? -1], 0.9, 0.65],
            }}
          />
          <Layer
            id="districts-line"
            type="line"
            paint={{
              'line-color': ['case', ['==', ['get', 'id'], hoveredId ?? -1], '#00d4aa', 'rgba(255,255,255,0.3)'],
              'line-width': ['case', ['==', ['get', 'id'], hoveredId ?? -1], 2, 0.5],
            }}
          />
        </Source>
      </Map>
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 8,
          background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-primary)',
          pointerEvents: 'none', zIndex: 20, maxWidth: 240, backdropFilter: 'blur(12px)',
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
