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

// Non-linear breakpoints per metric (domain knowledge, not color data).
// Colors always come from METRICS[].colorScale in constants.ts — the
// single source of truth for the grayscale ramp — so this table never
// duplicates a color value, only the stop positions.
const METRIC_STOPS: Record<string, [number, number, number, number]> = {
  temperature: [6, 20, 30, 42],
  rainfall: [0, 30, 80, 150],
  flood_risk: [0, 0.3, 0.6, 1],
  aqi: [0, 100, 200, 350],
  population: [0, 3000, 10000, 22000],
};

function getColorExpression(metricId: string): any {
  const metric = METRICS.find((m) => m.id === metricId) || METRICS[0];
  const stops = METRIC_STOPS[metric.id] || METRIC_STOPS.temperature;
  const [c0, c1, c2, c3] = metric.colorScale;
  return ['interpolate', ['linear'], ['get', metric.id], stops[0], c0, stops[1], c1, stops[2], c2, stops[3], c3];
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
    // This path only renders when a user supplies their own Mapbox token
    // (opt-in "live" upgrade — see README's data/API modes table). Mapbox's
    // hosted basemap styles/controls are outside our styling control, so
    // "light-v11" plus the .mapboxgl-ctrl override in globals.css is a
    // documented, accepted best-effort rather than a fully custom
    // monochrome Mapbox Studio style.
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: INDIA_CENTER[0], latitude: INDIA_CENTER[1], zoom: DEFAULT_ZOOM }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
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
                'line-color': ['case', ['==', ['get', 'id'], hoveredId ?? -1], '#000000', 'rgba(0,0,0,0.25)'],
                'line-width': ['case', ['==', ['get', 'id'], hoveredId ?? -1], 2, 0.4],
              }}
            />
          </Source>
        )}
      </Map>
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 12, top: tooltip.y - 8,
          background: '#FFFFFF', border: '1px solid #000000',
          padding: '8px 12px', fontSize: '0.8rem', color: '#000000', fontFamily: 'var(--font-body)',
          pointerEvents: 'none', zIndex: 20, maxWidth: 260,
        }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
