'use client';

import { useState, useEffect, useMemo } from 'react';
import { Map as MapIcon, Thermometer, Wind, Waves } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import TimeSeriesChart from '@/components/dashboard/TimeSeriesChart';
import HeatmapChart from '@/components/dashboard/HeatmapChart';
import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import Divider from '@/components/ui/Divider';
import { Select } from '@/components/ui/Input';
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

  // Bar fill encodes severity by value/weight (grayscale), never hue —
  // sourced from the same SEVERITY_COLORS table used for badges elsewhere.
  const rankColor = (d: DistrictMetrics) => {
    if (rankMetric === 'flood_risk') {
      const idx = Math.min(4, Math.floor(d.flood_risk * 5));
      return SEVERITY_COLORS[flood_order[idx]];
    }
    if (rankMetric === 'aqi') {
      const key = d.aqi > 300 ? 'critical' : d.aqi > 200 ? 'severe' : d.aqi > 100 ? 'medium' : 'low';
      return SEVERITY_COLORS[key];
    }
    const key = d.temperature > 38 ? 'critical' : d.temperature > 30 ? 'medium' : 'low';
    return SEVERITY_COLORS[key];
  };

  return (
    <div className="animate-fadeIn">
      <Header title="Dashboard" subtitle={`Environmental analytics across ${agg.count || '—'} Indian districts`}>
        <Select style={{ width: 170 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
          {options.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        <div className="flex gap-1">
          {[7, 30, 90, 120].map((r) => (
            <Button key={r} variant={range === r ? 'primary' : 'secondary'} size="sm" onClick={() => setRange(r)}>
              {`${r}d`}
            </Button>
          ))}
        </div>
      </Header>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatsCard icon={MapIcon} label="Districts Monitored" value={agg.count} loading={loading} />
        <StatsCard icon={Thermometer} label="Avg Temperature" value={agg.avgTemp} unit="°C" trend={2} loading={loading} />
        <StatsCard icon={Wind} label="Avg Air Quality" value={agg.avgAqi} unit="AQI" trend={-12} loading={loading} />
        <StatsCard icon={Waves} label="High Flood Risk" value={agg.highFlood} unit="districts" trend={5} loading={loading} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <TimeSeriesChart data={tempSeries} title={`Temperature — ${selected}`} type="area" unit="°C" />
        <TimeSeriesChart data={rainSeries} title={`Rainfall — ${selected}`} type="bar" unit="mm" />
      </div>

      {/* Charts Row 2 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <TimeSeriesChart data={aqiSeries} title={`Air Quality Index — ${selected}`} type="area" unit="AQI" />
        <HeatmapChart title="Temperature Heatmap (Weekly)" />
      </div>

      {/* Top-risk ranking */}
      <Divider />
      <div className="glass-card">
        <div className="chart-title" style={{ marginBottom: 16 }}>
          <span>Top Districts by Risk</span>
          <div className="flex gap-1">
            {([['flood_risk', 'Flood'], ['aqi', 'AQI'], ['temperature', 'Heat']] as const).map(([m, label]) => (
              <Button key={m} variant={rankMetric === m ? 'primary' : 'secondary'} size="sm" onClick={() => setRankMetric(m)}>
                {label}
              </Button>
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
                  <span className="font-mono" style={{ width: 20, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{i + 1}</span>
                  <span style={{ width: 130, fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ width: 120, fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.state_name}</span>
                  <div style={{ flex: 1, height: 8, border: '1px solid #000000', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(4, val * 100))}%`, height: '100%', background: rankColor(d), transition: 'width 0.4s' }} />
                  </div>
                  {/* Bar fill encodes severity; the number itself always stays
                      readable foreground text, never tied to the fill color. */}
                  <span className="font-mono" style={{ width: 64, textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{fmt(d)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
