'use client';

import { SEVERITY_COLORS } from '@/lib/constants';

interface Result {
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

export default function ResultsPanel({ results, simulationName, simulationType, onReset }: ResultsPanelProps) {
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
      <div className="glass-card" style={{ marginBottom: 20, padding: '20px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{simulationName || 'Simulation Results'}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {results.length} district result{results.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn-secondary" onClick={onReset} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            ← New Simulation
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div className="stat-card">
            <div className="stat-label">Avg Value</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>{avgValue}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Max Severity</div>
            <div style={{ marginTop: 4 }}>
              <span className="badge" style={{ background: `${SEVERITY_COLORS[maxSeverity] ?? '#64748b'}25`, color: SEVERITY_COLORS[maxSeverity] ?? 'var(--text-muted)', fontSize: '0.9rem', padding: '6px 14px' }}>
                {maxSeverity.charAt(0).toUpperCase() + maxSeverity.slice(1)}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Confidence</div>
            <div className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--accent-secondary)' }}>{avgConf}%</div>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="glass-card" style={{ overflow: 'auto' }}>
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
              const sev = r.severity_level?.toLowerCase() || 'low';
              const conf = r.confidence || 0.85;
              return (
                <tr key={`${r.district_id}-${r.metric_name}-${i}`} className="animate-fadeIn" style={{ animationDelay: `${i * 50}ms` }}>
                  <td style={{ fontWeight: 500 }}>{name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.metric_name}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-primary)' }}>
                    {Number(r.metric_value).toFixed(2)}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{r.metric_unit || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-secondary)' }}>
                        <div style={{ width: `${conf * 100}%`, height: '100%', borderRadius: 2, background: 'var(--accent-secondary)' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 36 }}>{(conf * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: `${SEVERITY_COLORS[sev] ?? '#64748b'}20`,
                      color: SEVERITY_COLORS[sev] ?? 'var(--text-muted)',
                    }}>
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </span>
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
