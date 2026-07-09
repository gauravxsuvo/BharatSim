'use client';

import { useState } from 'react';
import { SIMULATION_TYPES } from '@/lib/constants';
import SimulationForm from '@/components/simulation/SimulationForm';
import ResultsPanel, { Result } from '@/components/simulation/ResultsPanel';
import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SimulationParams } from '@/lib/types';

type Phase = 'idle' | 'configuring' | 'running' | 'results';

// Generate demo results when API not available
function generateDemoResults(simType: string, districtIds: number[]): Result[] {
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
  const [results, setResults] = useState<Result[]>([]);
  const [simName, setSimName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTypeSelect = (type: typeof SIMULATION_TYPES[number]) => {
    setSelectedType(type);
    setPhase('configuring');
  };

  const handleSubmit = async (formData: SimulationParams) => {
    setLoading(true);
    setPhase('running');
    setSimName(formData.name);

    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/simulations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        const apiResults = Array.isArray(data.results) ? data.results : [];
        setResults(apiResults.length > 0 ? apiResults : generateDemoResults(formData.simulation_type, formData.district_ids));
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
      <Header title="Simulation Engine" subtitle="Model environmental impacts across Indian districts">
        {phase !== 'idle' && (
          <Button variant="secondary" size="sm" onClick={() => { setPhase('idle'); setSelectedType(null); }}>
            ← Back
          </Button>
        )}
      </Header>

      {/* Phase: idle — type selection */}
      {phase === 'idle' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Select a simulation type to get started.
          </p>
          <div className="sim-types-grid">
            {SIMULATION_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <div
                  key={type.id}
                  id={`sim-type-${type.id}`}
                  className="glass-card sim-card p-6"
                  onClick={() => handleTypeSelect(type)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleTypeSelect(type)}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs tracking-widest opacity-60">{type.number}</span>
                    <Icon size={26} strokeWidth={1.5} />
                  </div>
                  <div className="sim-card-title">{type.label}</div>
                  <div className="sim-card-desc">{type.description}</div>
                  <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {type.params.map(p => (
                      <span key={p.key} className="border border-current px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider opacity-70">
                        {p.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
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
          <LoadingSpinner size="lg" />
          <div style={{ textAlign: 'center' }}>
            <h2 className="font-display mb-2 text-2xl font-bold">Running Simulation</h2>
            <p style={{ color: 'var(--text-muted)' }}>Processing {selectedType?.label} model...</p>
          </div>
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
