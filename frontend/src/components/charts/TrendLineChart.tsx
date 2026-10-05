import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendPoint } from '../../types';

export const TrendLineChart: React.FC<{ data: TrendPoint[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height={250}>
    <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#D8CEC4" strokeOpacity={0.6} />
      <XAxis
        dataKey="month"
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
          fontSize: '12px',
          fontFamily: 'Manrope, sans-serif',
          boxShadow: '0 4px 12px rgba(53, 38, 56, 0.08)',
        }}
      />
      <Legend wrapperStyle={{ color: '#70656B', fontSize: '12px', fontFamily: 'Manrope, sans-serif' }} />
      <Line
        type="monotone"
        dataKey="total"
        stroke="#352638"
        strokeWidth={2}
        dot={{ fill: '#352638', r: 4 }}
        name="Lots créés"
      />
      <Line
        type="monotone"
        dataKey="exported"
        stroke="#435432"
        strokeWidth={2}
        dot={{ fill: '#435432', r: 4 }}
        name="Exportés"
      />
      <Line
        type="monotone"
        dataKey="avgQuality"
        stroke="#AD5138"
        strokeWidth={2}
        dot={{ fill: '#AD5138', r: 4 }}
        name="Qualité moy."
      />
    </LineChart>
  </ResponsiveContainer>
);
