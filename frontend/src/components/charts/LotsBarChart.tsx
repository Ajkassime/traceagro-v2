import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Couleurs Terre & Registre
const STATUS_COLORS: Record<string, string> = {
  harvest: '#795015',    // À contrôler / Récolte
  processing: '#352638', // Aubergine / Transformation
  processed: '#4A354D',  // Aubergine relevée
  transit: '#AD5138',    // Argile / Transit
  exported: '#435432',   // Vérifié / Exporté
  rejected: '#963C47',   // Erreur / Rejeté
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
      <BarChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#D8CEC4" strokeOpacity={0.6} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#70656B', fontSize: 12, fontFamily: 'Manrope, sans-serif' }}
          axisLine={{ stroke: '#D8CEC4' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#70656B', fontSize: 12, fontFamily: 'Manrope, sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: '#FFFCF6',
            border: '1px solid #D8CEC4',
            borderRadius: '6px',
            color: '#352638',
            fontFamily: 'Manrope, sans-serif',
            fontSize: '12px',
            boxShadow: '0 4px 12px rgba(53, 38, 56, 0.08)',
          }}
          cursor={{ fill: 'rgba(234, 226, 235, 0.4)' }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={44}>
          {formatted.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#352638'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
