'use client';

import { DistrictMetrics } from '@/lib/indiaData';

interface DistrictPopupProps {
  district: DistrictMetrics;
  onClose: () => void;
}

const METRIC_ROWS: {
  key: keyof DistrictMetrics;
  label: string;
  unit: string;
  icon: string;
  format?: (v: number) => string;
}[] = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: '🌡️' },
  { key: 'rainfall', label: 'Rainfall', unit: 'mm', icon: '🌧️' },
  { key: 'aqi', label: 'Air Quality Index', unit: 'AQI', icon: '💨' },
  { key: 'flood_risk', label: 'Flood Risk', unit: '', icon: '🌊', format: (v: number) => `${(v * 100).toFixed(0)}%` },
  { key: 'population', label: 'Pop. Density', unit: '/km²', icon: '👥' },
];

export default function DistrictPopup({ district, onClose }: DistrictPopupProps) {
  return (
    <div
      className="glass-card animate-slideUp"
      style={{
        position: 'absolute',
        bottom: 32,
        left: 16,
        minWidth: 260,
        maxWidth: 300,
        zIndex: 10,
        padding: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{district.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{district.state_name}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close popup"
          style={{
            background: 'none',
            border: '1px solid var(--glass-border)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {METRIC_ROWS.map(row => {
          const val = district[row.key];
          if (val === undefined || val === null) return null;
          const display = row.format ? row.format(Number(val)) : `${val} ${row.unit}`;
          return (
            <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span>{row.icon}</span>{row.label}
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
