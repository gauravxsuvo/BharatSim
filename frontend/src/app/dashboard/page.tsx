'use client';

import { useState, useEffect, useMemo } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import TimeSeriesChart from '@/components/dashboard/TimeSeriesChart';
import HeatmapChart from '@/components/dashboard/HeatmapChart';

// Generate demo time-series data
function generateDemoSeries(base: number, variance: number, days = 30) {
  const out: { date: string; value: number }[] = [];
  const start = new Date('2024-01-01');
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ date: d.toISOString().split('T')[0], value: +(base + (Math.random() - 0.5) * variance).toFixed(1) });
  }
  return out;
}

const DISTRICTS = ['Mumbai', 'Pune', 'Chennai', 'Lucknow', 'Jaipur', 'Kolkata', 'Varanasi', 'Jodhpur', 'Coimbatore', 'Darjeeling'];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total_districts: 0, total_weather_records: 0, total_river_records: 0, total_simulations: 0, latest_data_date: null as string | null });
  const [selectedDistrict, setSelectedDistrict] = useState('Mumbai');
  const [range, setRange] = useState(30);
  const tempSeries = useMemo(() => generateDemoSeries(25, 8, range), [range, selectedDistrict]);
  const rainSeries = useMemo(() => generateDemoSeries(20, 30, range), [range, selectedDistrict]);
  const aqiSeries = useMemo(() => generateDemoSeries(150, 80, range), [range, selectedDistrict]);

  useEffect(() => {
    // Try real API, fall back to demo
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/dashboard/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => setStats({ total_districts: 10, total_weather_records: 3650, total_river_records: 0, total_simulations: 7, latest_data_date: '2024-01-30' }))
      .finally(() => setLoading(false));
  }, []);


  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Environmental metrics across monitored districts</p>
        </div>
        <div className="header-actions">
          <select
            id="district-selector"
            className="input-field"
            style={{ width: 160 }}
            value={selectedDistrict}
            onChange={e => setSelectedDistrict(e.target.value)}
          >
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {[7, 30, 90, 365].map(r => (
              <button
                key={r}
                className={range === r ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                onClick={() => setRange(r)}
              >
                {r === 365 ? '1y' : `${r}d`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatsCard icon="🗺️" label="Districts Monitored" value={stats.total_districts} loading={loading} />
        <StatsCard icon="🌡️" label="Avg Temperature" value={25} unit="°C" trend={2} color="var(--accent-warning)" loading={loading} />
        <StatsCard icon="🌧️" label="Total Rainfall" value={stats.total_weather_records ? 1840 : 0} unit="mm" trend={-5} color="var(--accent-info)" loading={loading} />
        <StatsCard icon="💨" label="Avg Air Quality" value={148} unit="AQI" trend={-12} color="var(--accent-secondary)" loading={loading} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <TimeSeriesChart
          data={tempSeries}
          title={`Temperature — ${selectedDistrict}`}
          color="#f59e0b"
          type="area"
          unit="°C"
        />
        <TimeSeriesChart
          data={rainSeries}
          title={`Rainfall — ${selectedDistrict}`}
          color="#3b82f6"
          type="bar"
          unit="mm"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid-2">
        <HeatmapChart title="Temperature Heatmap (Weekly)" />
        <TimeSeriesChart
          data={aqiSeries}
          title={`Air Quality Index — ${selectedDistrict}`}
          color="#ef4444"
          type="area"
          unit="AQI"
        />
      </div>

      {/* Latest date notice */}
      {stats.latest_data_date && (
        <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Last updated: {stats.latest_data_date}
        </div>
      )}
    </div>
  );
}
