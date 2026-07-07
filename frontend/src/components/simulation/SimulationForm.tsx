'use client';

import { useState } from 'react';
import { SIMULATION_TYPES } from '@/lib/constants';

interface SimulationFormProps {
  simulationType: typeof SIMULATION_TYPES[number];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const DEMO_DISTRICTS = [
  { id: 1, name: 'Mumbai' }, { id: 2, name: 'Pune' }, { id: 3, name: 'Chennai' },
  { id: 4, name: 'Coimbatore' }, { id: 5, name: 'Lucknow' }, { id: 6, name: 'Varanasi' },
  { id: 7, name: 'Jaipur' }, { id: 8, name: 'Jodhpur' }, { id: 9, name: 'Kolkata' },
  { id: 10, name: 'Darjeeling' },
];

export default function SimulationForm({ simulationType, onSubmit, onCancel, loading }: SimulationFormProps) {
  const defaultParams = Object.fromEntries(simulationType.params.map(p => [p.key, p.default]));

  const [name, setName] = useState(`${simulationType.label} Simulation`);
  const [description, setDescription] = useState('');
  const [params, setParams] = useState<Record<string, number>>(defaultParams);
  const [selectedDistricts, setSelectedDistricts] = useState<number[]>([1, 2, 3]);
  const [dateStart, setDateStart] = useState('2024-01-01');
  const [dateEnd, setDateEnd] = useState('2024-01-31');

  const toggleDistrict = (id: number) => {
    setSelectedDistricts(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDistricts.length === 0) { alert('Please select at least one district.'); return; }
    onSubmit({
      simulation_type: simulationType.id,
      name, description,
      district_ids: selectedDistricts,
      date_range_start: dateStart,
      date_range_end: dateEnd,
      parameters: params,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card animate-slideUp" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.8rem' }}>{simulationType.icon}</span>
          {simulationType.label}
        </h2>
        <button type="button" className="btn-secondary" onClick={onCancel} style={{ padding: '6px 14px' }}>
          Cancel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Simulation Name</label>
          <input id="sim-name" className="input-field" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Description (optional)</label>
          <input id="sim-desc" className="input-field" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        {/* Date range */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Start Date</label>
          <input id="sim-date-start" type="date" className="input-field" value={dateStart} onChange={e => setDateStart(e.target.value)} required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>End Date</label>
          <input id="sim-date-end" type="date" className="input-field" value={dateEnd} onChange={e => setDateEnd(e.target.value)} required />
        </div>
      </div>

      {/* Parameters */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-secondary)' }}>Simulation Parameters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {simulationType.params.map(param => (
            <div key={param.key} className="param-slider">
              <div className="param-label">
                <span>{param.label}</span>
                <span className="param-value">{params[param.key]}</span>
              </div>
              <input
                id={`param-${param.key}`}
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={params[param.key]}
                onChange={e => setParams(prev => ({ ...prev, [param.key]: Number(e.target.value) }))}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                <span>{param.min}</span><span>{param.max}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Districts */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: '0.95rem', marginBottom: 12, color: 'var(--text-secondary)' }}>
          Districts ({selectedDistricts.length} selected)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {DEMO_DISTRICTS.map(d => (
            <label
              key={d.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                padding: '8px 10px', borderRadius: 8,
                border: `1px solid ${selectedDistricts.includes(d.id) ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                background: selectedDistricts.includes(d.id) ? 'rgba(0,212,170,0.08)' : 'transparent',
                fontSize: '0.8rem', color: selectedDistricts.includes(d.id) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              <input
                type="checkbox"
                checked={selectedDistricts.includes(d.id)}
                onChange={() => toggleDistrict(d.id)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              {d.name}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '12px' }}>
        {loading ? 'Running Simulation...' : '⚡ Run Simulation'}
      </button>
    </form>
  );
}
