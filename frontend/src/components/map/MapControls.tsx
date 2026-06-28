'use client';

import { METRICS } from '@/lib/constants';

interface MapControlsProps {
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
}

export default function MapControls({ selectedMetric, onMetricChange }: MapControlsProps) {
  const metric = METRICS.find(m => m.id === selectedMetric) || METRICS[0];

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minWidth: 220,
    }}>
      {/* Metric Selector */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Layer
        </div>
        <select
          id="metric-selector"
          className="input-field"
          value={selectedMetric}
          onChange={e => onMetricChange(e.target.value)}
          style={{ marginBottom: 16 }}
        >
          {METRICS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

        {/* Color Legend */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Scale</div>
          <div style={{
            height: 8,
            borderRadius: 4,
            background: `linear-gradient(to right, ${metric.colorScale.join(', ')})`,
            marginBottom: 4,
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="glass-card" style={{ padding: '12px 16px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <div>🖱️ Hover to inspect</div>
          <div>🖱️ Click to select district</div>
          <div>🔍 Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
}
