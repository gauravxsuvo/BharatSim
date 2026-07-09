'use client';

import { useId } from 'react';
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: { color?: string; value?: number | string }[];
  label?: string;
  unit?: string;
}

const CustomTooltip = ({ active, payload, label, unit }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #000000',
      padding: '10px 14px',
      fontSize: '0.85rem',
    }}>
      <div style={{ color: '#525252', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#000000', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
        {Number(payload[0].value).toFixed(1)} {unit}
      </div>
    </div>
  );
};

export default function TimeSeriesChart({ data, title, color = '#000000', type = 'area', unit = '' }: TimeSeriesChartProps) {
  const reactId = useId();
  const gradId = `chartGrad-${reactId.replace(/:/g, '')}`;

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
          <span className="font-mono text-xs text-muted-foreground">
            {data.length} data points
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#737373', fontSize: 11 }} axisLine={{ stroke: '#D4D4D4' }} tickLine={false} />
            <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Bar dataKey="value" fill={`url(#${gradId})`} radius={0} />
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#737373', fontSize: 11 }} axisLine={{ stroke: '#D4D4D4' }} tickLine={false} />
            <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
            <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fill: '#737373', fontSize: 11 }} axisLine={{ stroke: '#D4D4D4' }} tickLine={false} />
            <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: color }} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
