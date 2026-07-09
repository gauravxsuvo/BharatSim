'use client';

import { X, Thermometer, CloudRain, Wind, Waves, Users, LucideIcon } from 'lucide-react';
import { DistrictMetrics } from '@/lib/indiaData';

interface DistrictPopupProps {
  district: DistrictMetrics;
  onClose: () => void;
}

const METRIC_ROWS: {
  key: keyof DistrictMetrics;
  label: string;
  unit: string;
  icon: LucideIcon;
  format?: (v: number) => string;
}[] = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer },
  { key: 'rainfall', label: 'Rainfall', unit: 'mm', icon: CloudRain },
  { key: 'aqi', label: 'Air Quality Index', unit: 'AQI', icon: Wind },
  { key: 'flood_risk', label: 'Flood Risk', unit: '', icon: Waves, format: (v: number) => `${(v * 100).toFixed(0)}%` },
  { key: 'population', label: 'Pop. Density', unit: '/km²', icon: Users },
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
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="font-display text-lg font-bold">{district.name}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{district.state_name}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close popup"
          className="flex h-7 w-7 shrink-0 items-center justify-center border border-foreground text-foreground"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Metrics */}
      <div className="flex flex-col gap-2.5">
        {METRIC_ROWS.map(row => {
          const val = district[row.key];
          if (val === undefined || val === null) return null;
          const display = row.format ? row.format(Number(val)) : `${val} ${row.unit}`;
          const Icon = row.icon;
          return (
            <div key={row.key} className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon size={16} strokeWidth={1.5} />
                {row.label}
              </span>
              <span className="font-mono text-sm font-semibold text-foreground">
                {display}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
