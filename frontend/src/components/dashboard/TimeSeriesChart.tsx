'use client';

import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts';

interface TimeSeriesChartProps {
  data: { date: string; value: number }[];
  title: string;
  color?: string;
  type?: 'line' | 'area' | 'bar';
  unit?: string;
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(17,24,39,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: '0.85rem',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: payload[0].color, fontWeight: 600 }}>
        {Number(payload[0].value).toFixed(1)} {unit}
      </div>
    </div>
  );
};

export default function TimeSeriesChart({ data, title, color = '#00d4aa', type = 'area', unit = '' }: TimeSeriesChartProps) {
  const tickFormatter = (v: string) => {
    if (!v) return '';
    const d = new Date(v);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="chart-container">
      <div className="chart-title">
        <span>{title}</span>
        {data.length > 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {data.length} data points
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`barGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Bar dataKey="value" fill={`url(#barGrad-${color.replace('#', '')})`} radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`areaGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#areaGrad-${color.replace('#', '')})`} dot={false} activeDot={{ r: 4, fill: color }} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
