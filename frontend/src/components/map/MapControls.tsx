'use client';

import { MousePointer2, MousePointerClick, ZoomIn } from 'lucide-react';
import { METRICS } from '@/lib/constants';
import { METRIC_DOMAIN } from '@/lib/indiaData';
import { Select } from '@/components/ui/Input';

interface MapControlsProps {
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
}

export default function MapControls({ selectedMetric, onMetricChange }: MapControlsProps) {
  const metric = METRICS.find(m => m.id === selectedMetric) || METRICS[0];
  const [domainLow, domainHigh] = METRIC_DOMAIN[metric.id] || [0, 100];
  const domainMid = Math.round((domainLow + domainHigh) / 2);

  return (
    <div
      className="w-[180px] sm:w-[220px]"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Metric Selector */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Layer
        </div>
        <Select
          id="metric-selector"
          value={selectedMetric}
          onChange={e => onMetricChange(e.target.value)}
          className="mb-4"
        >
          {METRICS.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </Select>

        {/* Color Legend */}
        <div>
          <div className="mb-1.5 font-mono text-xs text-muted-foreground">Scale</div>
          <div style={{
            height: 8,
            background: `linear-gradient(to right, ${metric.colorScale.join(', ')})`,
            border: '1px solid #000000',
            marginBottom: 4,
          }} />
          <div className="flex justify-between font-mono text-[0.65rem] text-muted-foreground">
            <span>{domainLow}</span>
            <span>{domainMid}</span>
            <span>{domainHigh}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="glass-card flex flex-col gap-1.5" style={{ padding: '12px 16px' }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MousePointer2 size={14} strokeWidth={1.5} /> Hover to inspect
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MousePointerClick size={14} strokeWidth={1.5} /> Click to select district
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ZoomIn size={14} strokeWidth={1.5} /> Scroll to zoom
        </div>
      </div>
    </div>
  );
}
