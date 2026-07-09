/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { METRICS } from '@/lib/constants';
import {
  loadIndiaDistricts,
  colorForValue,
  METRIC_DOMAIN,
  EnrichedGeoJSON,
  DistrictMetrics,
} from '@/lib/indiaData';

interface Props {
  selectedMetric: string;
  onDistrictClick: (d: DistrictMetrics) => void;
}

const PW = 1000; // internal projection width

// Build the projection + per-feature SVG path strings from the GeoJSON.
function buildGeometry(geojson: EnrichedGeoJSON) {
  let minLon = 999, minLat = 999, maxLon = -999, maxLat = -999;
  const scan = (c: any) => {
    if (typeof c[0] === 'number') {
      if (c[0] < minLon) minLon = c[0];
      if (c[0] > maxLon) maxLon = c[0];
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
    } else for (const x of c) scan(x);
  };
  geojson.features.forEach((f) => scan(f.geometry.coordinates));

  const meanLat = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const kx = Math.cos(meanLat);
  const scale = PW / ((maxLon - minLon) * kx);
  const PH = (maxLat - minLat) * scale;
  const px = (lon: number) => (lon - minLon) * kx * scale;
  const py = (lat: number) => (maxLat - lat) * scale;

  const paths = geojson.features.map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let d = '';
    for (const poly of polys) {
      const ring = poly[0];
      d += 'M' + ring.map((pt: number[]) => `${px(pt[0]).toFixed(1)} ${py(pt[1]).toFixed(1)}`).join('L') + 'Z';
    }
    return { d, props: f.properties };
  });

  return { paths, PH };
}

export default function IndiaChoropleth({ selectedMetric, onDistrictClick }: Props) {
  const [geojson, setGeojson] = useState<EnrichedGeoJSON | null>(null);
  const [failed, setFailed] = useState(false);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(9999);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let alive = true;
    loadIndiaDistricts()
      .then((g) => { if (alive) setGeojson(g); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const { paths, PH } = useMemo(
    () => (geojson ? buildGeometry(geojson) : { paths: [], PH: 1000 }),
    [geojson]
  );

  const metric = METRICS.find((m) => m.id === selectedMetric) || METRICS[0];
  const colors = useMemo(() => {
    const domain = METRIC_DOMAIN[metric.id] || [0, 100];
    return paths.map((p) => colorForValue((p.props as any)[metric.id] ?? 0, metric.colorScale, domain));
  }, [paths, metric]);

  // ---- Pan / zoom via SVG viewBox ----
  const [view, setView] = useState({ x: 0, y: 0, w: PW, h: PH });
  const [prevPH, setPrevPH] = useState(PH);
  if (PH !== prevPH) {
    setPrevPH(PH);
    setView({ x: 0, y: 0, w: PW, h: PH });
  }

  const clampView = useCallback((v: { x: number; y: number; w: number; h: number }) => {
    const w = Math.max(PW * 0.12, Math.min(PW, v.w));
    const h = w * (PH / PW);
    const x = Math.max(-PW * 0.1, Math.min(PW * 1.1 - w, v.x));
    const y = Math.max(-PH * 0.1, Math.min(PH * 1.1 - h, v.y));
    return { x, y, w, h };
  }, [PH]);

  // Native, non-passive wheel handler so we can preventDefault (no page scroll).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;
      setView((v) => {
        const factor = e.deltaY > 0 ? 1.12 : 0.89;
        const nw = v.w * factor;
        const nh = nw * (PH / PW);
        const pointerX = v.x + relX * v.w;
        const pointerY = v.y + relY * v.h;
        return clampView({ x: pointerX - relX * nw, y: pointerY - relY * nh, w: nw, h: nh });
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [PH, clampView]);

  const drag = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };
  const onMouseMoveSvg = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setContainerWidth(rect.width);
    }
    if (drag.current && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((e.clientX - drag.current.x) / rect.width) * view.w;
      const dy = ((e.clientY - drag.current.y) / rect.height) * view.h;
      drag.current = { x: e.clientX, y: e.clientY };
      setView((v) => clampView({ ...v, x: v.x - dx, y: v.y - dy }));
    }
  };
  const endDrag = () => { drag.current = null; setIsDragging(false); };

  const hoveredPath = hoverId != null ? paths[hoverId] : null;
  const metricLabel = metric.label;

  // Base district mesh — memoised so hover/pan don't re-render 759 paths.
  const mesh = useMemo(() => (
    <g>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={colors[i]}
          stroke="rgba(10,15,28,0.55)"
          strokeWidth={0.4}
          vectorEffect="non-scaling-stroke"
          onMouseEnter={() => setHoverId(i)}
          onClick={() => onDistrictClick(p.props)}
          style={{ cursor: 'pointer' }}
        />
      ))}
    </g>
  ), [paths, colors, onDistrictClick]);

  if (failed) {
    return (
      <div style={fallbackWrap}>
        <div style={{ fontSize: '2.5rem' }}>🗺️</div>
        <p style={{ color: 'var(--text-secondary)' }}>Could not load map geometry.</p>
      </div>
    );
  }
  if (!geojson) {
    return (
      <div style={fallbackWrap}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '4px solid rgba(0,212,170,0.15)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Rendering {`India`}…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const val = hoveredPath ? (hoveredPath.props as any)[metric.id] : null;
  const displayVal = val == null ? 'N/A'
    : metric.id === 'flood_risk' ? `${Math.round(val * 100)}%`
    : `${val}${metric.unit ? ' ' + metric.unit : ''}`;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: 'radial-gradient(1200px 800px at 60% 15%, #0d1626 0%, #070b14 70%)', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        width="100%"
        height="100%"
        onMouseMove={onMouseMoveSvg}
        onMouseDown={onMouseDown}
        onMouseUp={endDrag}
        onMouseLeave={() => { setHoverId(null); setMouse(null); endDrag(); }}
        style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {mesh}
        {hoveredPath && (
          <path d={hoveredPath.d} fill="rgba(0,212,170,0.12)" stroke="#00d4aa" strokeWidth={1.4} vectorEffect="non-scaling-stroke" filter="url(#glow)" style={{ pointerEvents: 'none' }} />
        )}
      </svg>

      {hoveredPath && mouse && (
        <div style={{
          position: 'absolute', left: Math.min(mouse.x + 14, containerWidth - 220),
          top: mouse.y + 12, background: 'rgba(10,15,28,0.95)', border: '1px solid var(--glass-border)',
          borderRadius: 8, padding: '9px 13px', fontSize: '0.82rem', color: 'var(--text-primary)',
          pointerEvents: 'none', zIndex: 20, backdropFilter: 'blur(10px)', boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontWeight: 700 }}>{hoveredPath.props.name}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>{hoveredPath.props.state_name}</div>
          <div style={{ color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>{metricLabel}: {displayVal}</div>
        </div>
      )}

      {/* Reset view */}
      <button
        onClick={() => setView({ x: 0, y: 0, w: PW, h: PH })}
        title="Reset view"
        style={{
          position: 'absolute', bottom: 16, right: 16, zIndex: 15, width: 40, height: 40,
          borderRadius: 10, border: '1px solid var(--glass-border)', background: 'rgba(17,24,39,0.9)',
          color: 'var(--text-primary)', cursor: 'pointer', fontSize: '1.1rem', backdropFilter: 'blur(8px)',
        }}
      >⟲</button>

      {/* Offline / self-contained badge */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 15, fontSize: '0.68rem', color: 'var(--text-muted)', background: 'rgba(17,24,39,0.75)', padding: '5px 11px', borderRadius: 999, border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 6px var(--accent-primary)' }} />
        {geojson.features.length} districts · interactive vector map · drag & scroll to zoom
      </div>
    </div>
  );
}

const fallbackWrap: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 8,
  background: 'radial-gradient(1000px 700px at 60% 20%, #0d1626 0%, #070b14 70%)',
};
