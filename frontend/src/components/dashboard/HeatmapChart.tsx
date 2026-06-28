'use client';

import { useState } from 'react';

interface HeatmapRow {
  district: string;
  values: { label: string; value: number }[];
}

interface HeatmapChartProps {
  title: string;
  data?: HeatmapRow[];
  colorMin?: string;
  colorMax?: string;
}

// Demo data
const DEMO_DATA: HeatmapRow[] = [
  { district: 'Mumbai', values: [{ label: 'Week 1', value: 29 }, { label: 'Week 2', value: 31 }, { label: 'Week 3', value: 30 }, { label: 'Week 4', value: 32 }] },
  { district: 'Pune', values: [{ label: 'Week 1', value: 22 }, { label: 'Week 2', value: 24 }, { label: 'Week 3', value: 23 }, { label: 'Week 4', value: 25 }] },
  { district: 'Chennai', values: [{ label: 'Week 1', value: 28 }, { label: 'Week 2', value: 30 }, { label: 'Week 3', value: 29 }, { label: 'Week 4', value: 31 }] },
  { district: 'Lucknow', values: [{ label: 'Week 1', value: 15 }, { label: 'Week 2', value: 17 }, { label: 'Week 3', value: 18 }, { label: 'Week 4', value: 19 }] },
  { district: 'Jaipur', values: [{ label: 'Week 1', value: 16 }, { label: 'Week 2', value: 18 }, { label: 'Week 3', value: 17 }, { label: 'Week 4', value: 20 }] },
  { district: 'Kolkata', values: [{ label: 'Week 1', value: 21 }, { label: 'Week 2', value: 22 }, { label: 'Week 3', value: 23 }, { label: 'Week 4', value: 24 }] },
];

function interpolateColor(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(59 + t * (239 - 59));
  const g = Math.round(130 - t * 100);
  const b = Math.round(246 - t * 210);
  return `rgb(${r},${g},${b})`;
}

export default function HeatmapChart({ title, data, colorMin = '#3b82f6', colorMax = '#ef4444' }: HeatmapChartProps) {
  const rows = data && data.length > 0 ? data : DEMO_DATA;
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const allValues = rows.flatMap(r => r.values.map(v => v.value));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const cols = rows[0]?.values.map(v => v.label) || [];

  return (
    <div className="chart-container" style={{ position: 'relative' }}>
      <div className="chart-title"><span>{title}</span></div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ width: 100, textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px 8px' }}>District</th>
              {cols.map(col => (
                <th key={col} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: 4 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.district}>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px 8px', whiteSpace: 'nowrap' }}>{row.district}</td>
                {row.values.map((cell, i) => (
                  <td
                    key={i}
                    onMouseEnter={(e) => setTooltip({ text: `${row.district} ${cell.label}: ${cell.value}`, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      background: interpolateColor(cell.value, min, max),
                      borderRadius: 4,
                      height: 28,
                      cursor: 'pointer',
                      opacity: 0.85,
                      transition: 'opacity 0.2s',
                    }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{min}°C</span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: `linear-gradient(to right, #3b82f6, #22c55e, #f59e0b, #ef4444)` }} />
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{max}°C</span>
      </div>
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 32, background: 'rgba(17,24,39,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-primary)', pointerEvents: 'none', zIndex: 1000 }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
