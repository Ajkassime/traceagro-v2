import React from 'react';
import { cn } from '../../lib/utils';
import { Insight } from '../../types';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  danger:  <XCircle size={16} />,
  info:    <Info size={16} />,
};
const COLORS = {
  success: 'border-forest-500/30 bg-forest-500/5 text-forest-400',
  warning: 'border-vanilla-500/30 bg-vanilla-500/5 text-vanilla-400',
  danger:  'border-red-500/30 bg-red-500/5 text-red-400',
  info:    'border-blue-500/30 bg-blue-500/5 text-blue-400',
};

export const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => (
  <div className={cn('rounded-xl border p-3 flex gap-3 items-start', COLORS[insight.type])}>
    <span className="mt-0.5 flex-shrink-0">{ICONS[insight.type]}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium leading-tight">{insight.title}</p>
      <p className="text-xs opacity-70 mt-0.5 leading-relaxed">{insight.message}</p>
    </div>
    {insight.value && (
      <span className="font-mono text-sm font-bold ml-2 flex-shrink-0">{insight.value}</span>
    )}
  </div>
);
