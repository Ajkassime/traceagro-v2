import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  harvest: '#f59e0b', processing: '#3b82f6', processed: '#a855f7',
  transit: '#f97316', exported: '#22c55e', rejected: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  harvest: 'Récolte', processing: 'Transformation', processed: 'Transformé',
  transit: 'Transit', exported: 'Exporté', rejected: 'Rejeté',
};

interface LotsBarChartProps {
  data: { status: string; count: number }[];
}

export const LotsBarChart: React.FC<LotsBarChartProps> = ({ data }) => {
  const formatted = data.map((d) => ({
    name: STATUS_LABELS[d.status] || d.status,
    count: d.count,
    status: d.status,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f0f6fc' }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
          {formatted.map((entry) => <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
