'use client';

import { useEffect, useRef, useState } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  unit?: string;
  trend?: number;
  loading?: boolean;
}

export default function StatsCard({ icon: Icon, label, value, unit = '', trend, loading = false }: StatsCardProps) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (loading) return;
    let startTime: number | null = null;
    const duration = 900;

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * value));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, loading]);

  if (loading) {
    return (
      <div className="glass-card stat-card">
        <div className="skeleton" style={{ width: 48, height: 48, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: '60%', height: 40, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: '40%', height: 16 }} />
      </div>
    );
  }

  return (
    <div className="glass-card stat-card animate-slideUp">
      <Icon size={22} strokeWidth={1.5} className="mb-1 text-foreground" />
      <div className="stat-value">
        {displayed.toLocaleString()}
        {unit && <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
      {trend !== undefined && (
        <div className="stat-trend">
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> vs last month</span>
        </div>
      )}
    </div>
  );
}
