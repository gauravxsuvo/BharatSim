/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, ScaleControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { INDIA_CENTER, DEFAULT_ZOOM, METRICS } from '@/lib/constants';
import { loadIndiaDistricts, EnrichedGeoJSON, DistrictMetrics } from '@/lib/indiaData';
import IndiaChoropleth from './IndiaChoropleth';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const HAS_TOKEN = !!MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.') && !MAPBOX_TOKEN.includes('placeholder');

function getColorExpression(metric: string): any {
  const expressions: Record<string, any> = {
    temperature: ['interpolate', ['linear'], ['get', 'temperature'], 6, '#3b82f6', 20, '#22c55e', 30, '#f59e0b', 42, '#ef4444'],
    rainfall: ['interpolate', ['linear'], ['get', 'rainfall'], 0, '#dbeafe', 30, '#60a5fa', 80, '#2563eb', 150, '#1e3a8a'],
    flood_risk: ['interpolate', ['linear'], ['get', 'flood_risk'], 0, '#22c55e', 0.3, '#f59e0b', 0.6, '#ef4444', 1, '#991b1b'],
    aqi: ['interpolate', ['linear'], ['get', 'aqi'], 0, '#22c55e', 100, '#f59e0b', 200, '#ef4444', 350, '#7f1d1d'],
    population: ['interpolate', ['linear'], ['get', 'population'], 0, '#ddd6fe', 3000, '#a78bfa', 10000, '#7c3aed', 22000, '#4c1d95'],
  };
  return expressions[metric] || expressions.temperature;
}

export default function IndiaMap({
  selectedMetric,
  onDistrictClick,
}: {
  selectedMetric: string;
  onDistrictClick: (district: DistrictMetrics) => void;
}) {
  // No Mapbox token → render the fully self-contained SVG choropleth.
  if (!HAS_TOKEN) {
    return <IndiaChoropleth selectedMetric={selectedMetric} onDistrictClick={onDistrictClick} />;
  }
  return <MapboxView selectedMetric={selectedMetric} onDistrictClick={onDistrictClick} />;
}

function MapboxView({
  selectedMetric,
  onDistrictClick,
}: {
  selectedMetric: string;
  onDistrictClick: (district: DistrictMetrics) => void;
}) {
  const mapRef = useRef<any>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [geojson, setGeojson] = useState<EnrichedGeoJSON | null>(null);

  useEffect(() => {
    loadIndiaDistricts().then(setGeojson).catch(() => {});
  }, []);

  const onMouseMove = useCallback((e: any) => {
    const features = e.features;
    if (features && features.length > 0) {
      const props = features[0].properties || {};
      setHoveredId(props.id);
      const metricLabel = METRICS.find((m) => m.id === selectedMetric)?.label || selectedMetric;
      const val = props[selectedMetric] !== undefined ? props[selectedMetric] : 'N/A';
      setTooltip({ x: e.point.x, y: e.point.y, text: `${props.name}, ${props.state_name} — ${metricLabel}: ${val}` });
    } else {
      setHoveredId(null);
      setTooltip(null);
    }
  }, [selectedMetric]);

  const onMouseLeave = useCallback(() => { setHoveredId(null); setTooltip(null); }, []);

  const onClick = useCallback((e: any) => {
    if (e.features && e.features.length > 0) {
      onDistrictClick(e.features[0].properties);
      mapRef.current?.flyTo({ center: [e.lngLat.lng, e.lngLat.lat], zoom: 6.5, duration: 1200 });
    }
  }, [onDistrictClick]);

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
        {geojson && (
          <Source id="districts" type="geojson" data={geojson as any}>
            <Layer
              id="districts-fill"
              type="fill"
              paint={{
                'fill-color': getColorExpression(selectedMetric),
                'fill-opacity': ['case', ['==', ['get', 'id'], hoveredId ?? -1], 0.95, 0.7],
              }}
            />
            <Layer
              id="districts-line"
              type="line"
              paint={{
                'line-color': ['case', ['==', ['get', 'id'], hoveredId ?? -1], '#00d4aa', 'rgba(255,255,255,0.18)'],
                'line-width': ['case', ['==', ['get', 'id'], hoveredId ?? -1], 2, 0.4],
              }}
            />
          </Source>
        )}
      </Map>
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 8,
          background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-primary)',
          pointerEvents: 'none', zIndex: 20, maxWidth: 260, backdropFilter: 'blur(12px)',
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
