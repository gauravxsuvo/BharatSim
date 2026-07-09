/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapPinOff, RotateCcw } from 'lucide-react';
import { METRICS } from '@/lib/constants';
import {
  loadIndiaDistricts,
  colorForValue,
  METRIC_DOMAIN,
  EnrichedGeoJSON,
  DistrictMetrics,
} from '@/lib/indiaData';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
  // This canvas is inverted (black background, "photographic negative"),
  // so the scale is reversed from its canonical light-canvas orientation
  // in constants.ts: high values render light/white to stand out against
  // black, low values recede toward black instead of disappearing into it.
  const invertedScale = useMemo(() => [...metric.colorScale].reverse(), [metric]);
  const colors = useMemo(() => {
    const domain = METRIC_DOMAIN[metric.id] || [0, 100];
    return paths.map((p) => colorForValue((p.props as any)[metric.id] ?? 0, invertedScale, domain));
  }, [paths, metric, invertedScale]);

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

  // Kept in sync with `view` so the native (non-passive) touch listeners
  // below — registered once — always zoom/pan from the current viewBox
  // instead of a stale closure.
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

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

  // Touch support: one finger pans, two fingers pinch-zoom anchored on the
  // pinch midpoint (mirrors the wheel handler's pointer-anchored zoom).
  // Registered as native, non-passive listeners — same reasoning as the
  // wheel handler — so preventDefault reliably stops the page from
  // scrolling/zooming under the gesture.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    let mode: 'pan' | 'pinch' | null = null;
    let lastTouch = { x: 0, y: 0 };
    let startDist = 0;
    let startView = viewRef.current;

    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const center = (t: TouchList, rect: DOMRect) => ({
      x: (t[0].clientX + t[1].clientX) / 2 - rect.left,
      y: (t[0].clientY + t[1].clientY) / 2 - rect.top,
    });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        mode = 'pan';
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        mode = 'pinch';
        startDist = dist(e.touches);
        startView = viewRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!mode) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();

      if (mode === 'pan' && e.touches.length === 1) {
        const dx = ((e.touches[0].clientX - lastTouch.x) / rect.width) * viewRef.current.w;
        const dy = ((e.touches[0].clientY - lastTouch.y) / rect.height) * viewRef.current.h;
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setView((v) => clampView({ ...v, x: v.x - dx, y: v.y - dy }));
      } else if (mode === 'pinch' && e.touches.length === 2) {
        const newDist = dist(e.touches);
        if (newDist < 1) return;
        const { x: cx, y: cy } = center(e.touches, rect);
        const relX = cx / rect.width;
        const relY = cy / rect.height;
        const factor = startDist / newDist;
        const nw = startView.w * factor;
        const nh = nw * (PH / PW);
        const pointerX = startView.x + relX * startView.w;
        const pointerY = startView.y + relY * startView.h;
        setView(clampView({ x: pointerX - relX * nw, y: pointerY - relY * nh, w: nw, h: nh }));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        mode = null;
      } else if (e.touches.length === 1) {
        // Dropped from pinch to a single finger — resume as a pan from here.
        mode = 'pan';
        lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [PH, clampView]);

  const hoveredPath = hoverId != null ? paths[hoverId] : null;
  const metricLabel = metric.label;

  // Base district mesh — memoised so hover/pan don't re-render 759 paths.
  // A white hairline stroke, not dark-on-dark, since the canvas is black.
  const mesh = useMemo(() => (
    <g>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={colors[i]}
          stroke="rgba(255,255,255,0.3)"
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
        <MapPinOff size={40} strokeWidth={1.5} color="#FFFFFF" />
        <p className="font-body text-white/70">Could not load map geometry.</p>
      </div>
    );
  }
  if (!geojson) {
    return (
      <div style={fallbackWrap}>
        <LoadingSpinner label="Rendering India" inverted />
      </div>
    );
  }

  const val = hoveredPath ? (hoveredPath.props as any)[metric.id] : null;
  const displayVal = val == null ? 'N/A'
    : metric.id === 'flood_risk' ? `${Math.round(val * 100)}%`
    : `${val}${metric.unit ? ' ' + metric.unit : ''}`;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ background: 'radial-gradient(1200px 800px at 60% 15%, #0a0a0a 0%, #000000 70%)' }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        width="100%"
        height="100%"
        onMouseMove={onMouseMoveSvg}
        onMouseDown={onMouseDown}
        onMouseUp={endDrag}
        onMouseLeave={() => { setHoverId(null); setMouse(null); endDrag(); }}
        style={{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        {mesh}
        {hoveredPath && (
          <path d={hoveredPath.d} fill="rgba(255,255,255,0.15)" stroke="#FFFFFF" strokeWidth={1.4} vectorEffect="non-scaling-stroke" style={{ pointerEvents: 'none' }} />
        )}
      </svg>

      {hoveredPath && mouse && (
        <div
          className="absolute z-20 border border-foreground bg-background px-3.5 py-2.5 text-card-foreground"
          style={{ left: Math.min(mouse.x + 14, containerWidth - 220), top: mouse.y + 12, pointerEvents: 'none' }}
        >
          <div className="font-display text-base font-bold">{hoveredPath.props.name}</div>
          <div className="mb-1 text-xs text-muted-foreground">{hoveredPath.props.state_name}</div>
          <div className="font-mono text-sm">{metricLabel}: {displayVal}</div>
        </div>
      )}

      {/* Reset view */}
      <button
        onClick={() => setView({ x: 0, y: 0, w: PW, h: PH })}
        title="Reset view"
        className="absolute bottom-4 right-4 z-[15] flex h-10 w-10 items-center justify-center border border-background bg-white text-black"
      >
        <RotateCcw size={18} strokeWidth={1.5} />
      </button>

      {/* Offline / self-contained badge — pushed below the mobile hamburger
          button (also anchored top-4 left-4, but viewport-fixed) so the two
          don't stack on top of each other on small screens. */}
      <div className="absolute top-16 left-4 z-[15] flex max-w-[160px] items-center gap-2 border border-white/40 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white sm:max-w-none md:top-4">
        <span className="h-1.5 w-1.5 shrink-0 bg-white animate-pulse" />
        <span className="truncate">{geojson.features.length} districts</span>
        <span className="hidden shrink-0 sm:inline">· drag/pinch to zoom</span>
      </div>
    </div>
  );
}

const fallbackWrap: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 12,
  background: '#000000',
};
