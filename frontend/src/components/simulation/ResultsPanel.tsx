'use client';

import Button from '@/components/ui/Button';
import SeverityBadge from '@/components/ui/SeverityBadge';

export interface Result {
  district_id?: number;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  confidence?: number;
  severity_level?: string;
  district_name?: string;
}

interface ResultsPanelProps {
  results: Result[];
  simulationName?: string;
  simulationType?: string;
  onReset: () => void;
}

const DISTRICT_NAMES: Record<number, string> = {
  1: 'Mumbai', 2: 'Pune', 3: 'Chennai', 4: 'Coimbatore',
  5: 'Lucknow', 6: 'Varanasi', 7: 'Jaipur', 8: 'Jodhpur', 9: 'Kolkata', 10: 'Darjeeling',
};

export default function ResultsPanel({ results, simulationName, onReset }: ResultsPanelProps) {
  const avgValue = results.length > 0 ? (results.reduce((s, r) => s + r.metric_value, 0) / results.length).toFixed(2) : '—';
  const maxSeverity = results.reduce((max, r) => {
    const order = ['low', 'medium', 'high', 'severe', 'critical'];
    const ri = order.indexOf(r.severity_level?.toLowerCase() || 'low');
    const mi = order.indexOf(max);
    return ri > mi ? (r.severity_level?.toLowerCase() || 'low') : max;
  }, 'low');
  const avgConf = results.length > 0 ? (results.reduce((s, r) => s + (r.confidence || 0.85), 0) / results.length * 100).toFixed(0) : 85;

  return (
    <div className="animate-slideUp">
      {/* Summary bar */}
      <div className="glass-card mb-5 flex flex-col gap-4 p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">{simulationName || 'Simulation Results'}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {results.length} district result{results.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onReset}>
            ← New Simulation
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <div className="stat-label">Avg Value</div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{avgValue}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Max Severity</div>
            <div style={{ marginTop: 4 }}>
              <SeverityBadge severity={maxSeverity} className="!text-sm" />
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Confidence</div>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{avgConf}%</div>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="glass-card table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>District</th>
              <th>Metric</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Confidence</th>
              <th>Severity</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => {
              const name = r.district_name || (r.district_id ? DISTRICT_NAMES[r.district_id] : `District ${r.district_id}`);
              const conf = r.confidence || 0.85;
              return (
                <tr key={`${r.district_id}-${r.metric_name}-${i}`} className="animate-fadeIn" style={{ animationDelay: `${i * 50}ms` }}>
                  <td style={{ fontWeight: 500 }}>{name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.metric_name}</td>
                  <td className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {Number(r.metric_value).toFixed(2)}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.metric_unit || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, border: '1px solid #000000', background: 'var(--bg-secondary)' }}>
                        <div style={{ width: `${conf * 100}%`, height: '100%', background: '#000000' }} />
                      </div>
                      <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 36 }}>{(conf * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <SeverityBadge severity={r.severity_level} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
