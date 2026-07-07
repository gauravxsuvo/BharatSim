'use client';

import { useState, useEffect, useMemo } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import TimeSeriesChart from '@/components/dashboard/TimeSeriesChart';
import HeatmapChart from '@/components/dashboard/HeatmapChart';
import { loadIndiaDistricts, DistrictMetrics } from '@/lib/indiaData';
import { SEVERITY_COLORS } from '@/lib/constants';

// Deterministic PRNG so charts are stable and reproducible across reloads.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFrom(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Build a seasonal daily series anchored on the district's baseline value.
function buildSeries(base: number, variance: number, days: number, key: string) {
  const rand = mulberry32(seedFrom(key));
  const out: { date: string; value: number }[] = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const seasonal = Math.sin((i / days) * Math.PI) * variance * 0.6;
    const noise = (rand() - 0.5) * variance;
    out.push({ date: d.toISOString().split('T')[0], value: +Math.max(0, base + seasonal + noise).toFixed(1) });
  }
  return out;
}

const flood_order = ['low', 'medium', 'high', 'severe', 'critical'];

export default function DashboardPage() {
  const [districts, setDistricts] = useState<DistrictMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('Mumbai');
  const [range, setRange] = useState(30);
  const [rankMetric, setRankMetric] = useState<'flood_risk' | 'aqi' | 'temperature'>('flood_risk');

  useEffect(() => {
    loadIndiaDistricts()
      .then((g) => setDistricts(g.features.map((f) => f.properties)))
      .catch(() => setDistricts([]))
      .finally(() => setLoading(false));
  }, []);

  const byName = useMemo(() => {
    const m = new Map<string, DistrictMetrics>();
    districts.forEach((d) => { if (!m.has(d.name)) m.set(d.name, d); });
    return m;
  }, [districts]);

  const options = useMemo(() => {
    // Prefer well-known metros first, then fill alphabetically.
    const priority = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bengaluru Urban', 'Hyderabad', 'Pune', 'Jaipur', 'Lucknow', 'Varanasi'];
    const present = priority.filter((p) => byName.has(p));
    const rest = [...byName.keys()].filter((n) => !present.includes(n)).sort();
    return [...present, ...rest].slice(0, 60);
  }, [byName]);

  const cur = byName.get(selected);

  const agg = useMemo(() => {
    if (!districts.length) return { count: 0, avgTemp: 0, avgAqi: 0, highFlood: 0, avgRain: 0 };
    const n = districts.length;
    const sum = districts.reduce(
      (a, d) => ({ t: a.t + d.temperature, q: a.q + d.aqi, r: a.r + d.rainfall, f: a.f + (d.flood_risk >= 0.6 ? 1 : 0) }),
      { t: 0, q: 0, r: 0, f: 0 }
    );
    return { count: n, avgTemp: Math.round(sum.t / n), avgAqi: Math.round(sum.q / n), avgRain: Math.round(sum.r / n), highFlood: sum.f };
  }, [districts]);

  const tempSeries = useMemo(() => buildSeries(cur?.temperature ?? 25, 8, range, `t${selected}`), [cur, range, selected]);
  const rainSeries = useMemo(() => buildSeries(cur?.rainfall ?? 20, 30, range, `r${selected}`), [cur, range, selected]);
  const aqiSeries = useMemo(() => buildSeries(cur?.aqi ?? 150, 70, range, `a${selected}`), [cur, range, selected]);

  const ranked = useMemo(() => {
    const arr = [...districts];
    arr.sort((a, b) => (b[rankMetric] as number) - (a[rankMetric] as number));
    return arr.slice(0, 8);
  }, [districts, rankMetric]);

  const fmt = (d: DistrictMetrics) =>
    rankMetric === 'flood_risk' ? `${Math.round(d.flood_risk * 100)}%`
    : rankMetric === 'aqi' ? `${d.aqi} AQI`
    : `${d.temperature}°C`;

  const rankColor = (d: DistrictMetrics) => {
    if (rankMetric === 'flood_risk') {
      const idx = Math.min(4, Math.floor(d.flood_risk * 5));
      return SEVERITY_COLORS[flood_order[idx]];
    }
    if (rankMetric === 'aqi') return d.aqi > 300 ? '#7f1d1d' : d.aqi > 200 ? '#ef4444' : d.aqi > 100 ? '#f59e0b' : '#22c55e';
    return d.temperature > 38 ? '#ef4444' : d.temperature > 30 ? '#f59e0b' : '#22c55e';
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Environmental analytics across {agg.count || '—'} Indian districts</p>
        </div>
        <div className="header-actions">
          <select className="input-field" style={{ width: 170 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
            {options.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {[7, 30, 90, 120].map((r) => (
              <button key={r} className={range === r ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => setRange(r)}>
                {`${r}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatsCard icon="🗺️" label="Districts Monitored" value={agg.count} loading={loading} />
        <StatsCard icon="🌡️" label="Avg Temperature" value={agg.avgTemp} unit="°C" trend={2} color="var(--accent-warning)" loading={loading} />
        <StatsCard icon="💨" label="Avg Air Quality" value={agg.avgAqi} unit="AQI" trend={-12} color="var(--accent-secondary)" loading={loading} />
        <StatsCard icon="🌊" label="High Flood Risk" value={agg.highFlood} unit="districts" trend={5} color="var(--accent-danger)" loading={loading} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <TimeSeriesChart data={tempSeries} title={`Temperature — ${selected}`} color="#f59e0b" type="area" unit="°C" />
        <TimeSeriesChart data={rainSeries} title={`Rainfall — ${selected}`} color="#3b82f6" type="bar" unit="mm" />
      </div>

      {/* Charts Row 2 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <TimeSeriesChart data={aqiSeries} title={`Air Quality Index — ${selected}`} color="#ef4444" type="area" unit="AQI" />
        <HeatmapChart title="Temperature Heatmap (Weekly)" />
      </div>

      {/* Top-risk ranking */}
      <div className="glass-card">
        <div className="chart-title" style={{ marginBottom: 16 }}>
          <span>Top Districts by Risk</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {([['flood_risk', 'Flood'], ['aqi', 'AQI'], ['temperature', 'Heat']] as const).map(([m, label]) => (
              <button key={m} className={rankMetric === m ? 'btn-primary' : 'btn-secondary'} style={{ padding: '5px 12px', fontSize: '0.75rem' }} onClick={() => setRankMetric(m)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ranked.map((d, i) => {
              const val = rankMetric === 'flood_risk' ? d.flood_risk : rankMetric === 'aqi' ? d.aqi / 350 : d.temperature / 44;
              return (
                <div key={d.name + i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 20, color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>
                  <span style={{ width: 130, fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ width: 120, fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.state_name}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(4, val * 100))}%`, height: '100%', background: rankColor(d), borderRadius: 4, transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ width: 64, textAlign: 'right', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', color: rankColor(d) }}>{fmt(d)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
