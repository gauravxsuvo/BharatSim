'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { SIMULATION_TYPES } from '@/lib/constants';
import { SimulationParams } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface SimulationFormProps {
  simulationType: typeof SIMULATION_TYPES[number];
  onSubmit: (data: SimulationParams) => void;
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

  const Icon = simulationType.icon;

  return (
    <form onSubmit={handleSubmit} className="glass-card animate-slideUp" style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="font-display flex items-center gap-3 text-2xl font-bold">
          <Icon size={28} strokeWidth={1.5} />
          {simulationType.label}
        </h2>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Simulation Name</label>
          <Input id="sim-name" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Description (optional)</label>
          <Input id="sim-desc" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        {/* Date range */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Start Date</label>
          <Input id="sim-date-start" type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} required />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>End Date</label>
          <Input id="sim-date-end" type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} required />
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
          {DEMO_DISTRICTS.map(d => {
            const active = selectedDistricts.includes(d.id);
            return (
              <label
                key={d.id}
                className="flex cursor-pointer items-center gap-2 border px-2.5 py-2 text-sm transition-colors duration-100"
                style={{
                  borderColor: '#000000',
                  background: active ? '#000000' : 'transparent',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleDistrict(d.id)}
                  style={{ accentColor: '#000000' }}
                />
                {d.name}
              </label>
            );
          })}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        <Zap size={16} strokeWidth={1.5} />
        {loading ? 'Running Simulation...' : 'Run Simulation'}
      </Button>
    </form>
  );
}
