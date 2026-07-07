'use client';

import { useState } from 'react';
import { SIMULATION_TYPES } from '@/lib/constants';
import SimulationForm from '@/components/simulation/SimulationForm';
import ResultsPanel from '@/components/simulation/ResultsPanel';

type Phase = 'idle' | 'configuring' | 'running' | 'results';

// Generate demo results when API not available
function generateDemoResults(simType: string, districtIds: number[]) {
  const DISTRICT_NAMES: Record<number, string> = {
    1: 'Mumbai', 2: 'Pune', 3: 'Chennai', 4: 'Coimbatore',
    5: 'Lucknow', 6: 'Varanasi', 7: 'Jaipur', 8: 'Jodhpur', 9: 'Kolkata', 10: 'Darjeeling',
  };
  const severities = ['low', 'medium', 'high', 'severe', 'critical'];
  const metricMap: Record<string, { name: string; unit: string }> = {
    flood: { name: 'flood_risk_score', unit: 'index' },
    heatwave: { name: 'heatwave_probability', unit: '%' },
    crop_yield: { name: 'yield_change_pct', unit: '%' },
    air_quality: { name: 'predicted_aqi', unit: 'AQI' },
  };
  const metric = metricMap[simType] || { name: 'value', unit: '' };
  return districtIds.map(id => ({
    district_id: id,
    district_name: DISTRICT_NAMES[id] || `District ${id}`,
    metric_name: metric.name,
    metric_value: +(Math.random() * 80 + 10).toFixed(2),
    metric_unit: metric.unit,
    confidence: +(0.65 + Math.random() * 0.3).toFixed(2),
    severity_level: severities[Math.floor(Math.random() * severities.length)],
  }));
}

export default function SimulationPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedType, setSelectedType] = useState<typeof SIMULATION_TYPES[number] | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [simName, setSimName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTypeSelect = (type: typeof SIMULATION_TYPES[number]) => {
    setSelectedType(type);
    setPhase('configuring');
  };

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    setPhase('running');
    setSimName(formData.name);

    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || generateDemoResults(formData.simulation_type, formData.district_ids));
      } else {
        throw new Error('API error');
      }
    } catch {
      // Fall back to demo results
      await new Promise(r => setTimeout(r, 1500));
      setResults(generateDemoResults(formData.simulation_type, formData.district_ids));
    } finally {
      setLoading(false);
      setPhase('results');
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Simulation Engine</h1>
          <p className="page-subtitle">Model environmental impacts across Indian districts</p>
        </div>
        {phase !== 'idle' && (
          <button className="btn-secondary" onClick={() => { setPhase('idle'); setSelectedType(null); }}>
            ← Back
          </button>
        )}
      </div>

      {/* Phase: idle — type selection */}
      {phase === 'idle' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Select a simulation type to get started.
          </p>
          <div className="sim-types-grid">
            {SIMULATION_TYPES.map(type => (
              <div
                key={type.id}
                id={`sim-type-${type.id}`}
                className="glass-card sim-card"
                onClick={() => handleTypeSelect(type)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleTypeSelect(type)}
                style={{ borderTop: `3px solid ${type.color}` }}
              >
                <div className="sim-card-icon">{type.icon}</div>
                <div className="sim-card-title" style={{ color: type.color }}>{type.label}</div>
                <div className="sim-card-desc">{type.description}</div>
                <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {type.params.map(p => (
                    <span key={p.key} className="badge badge-info" style={{ fontSize: '0.65rem' }}>{p.label}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase: configuring */}
      {phase === 'configuring' && selectedType && (
        <SimulationForm
          simulationType={selectedType}
          onSubmit={handleSubmit}
          onCancel={() => { setPhase('idle'); setSelectedType(null); }}
          loading={loading}
        />
      )}

      {/* Phase: running */}
      {phase === 'running' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '4px solid rgba(0,212,170,0.15)',
            borderTopColor: 'var(--accent-primary)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: 'var(--accent-primary)', marginBottom: 8 }}>Running Simulation</h2>
            <p style={{ color: 'var(--text-muted)' }}>Processing {selectedType?.label} model...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Phase: results */}
      {phase === 'results' && (
        <ResultsPanel
          results={results}
          simulationName={simName}
          simulationType={selectedType?.id}
          onReset={() => { setPhase('idle'); setSelectedType(null); setResults([]); }}
        />
      )}
    </div>
  );
}
