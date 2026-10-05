import React from 'react';
import { cn } from '../../lib/utils';
import { Insight } from '../../types';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={16} className="text-[#435432]" />,
  warning: <AlertTriangle size={16} className="text-[#795015]" />,
  danger:  <XCircle size={16} className="text-[#963C47]" />,
  info:    <Info size={16} className="text-[#352638]" />,
};

const COLORS = {
  success: 'border-[#435432]/30 bg-[#E5ECD9] text-[#435432]',
  warning: 'border-[#795015]/30 bg-[#F5E8CC] text-[#795015]',
  danger:  'border-[#963C47]/30 bg-[#F8E6E8] text-[#963C47]',
  info:    'border-[#D8CEC4] bg-[#EAE2EB] text-[#352638]',
};

export const InsightCard: React.FC<{ insight: Insight }> = ({ insight }) => (
  <div className={cn('rounded-[6px] border p-3.5 flex gap-3 items-start', COLORS[insight.type])}>
    <span className="mt-0.5 flex-shrink-0">{ICONS[insight.type]}</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold leading-tight">{insight.title}</p>
      <p className="text-xs opacity-85 mt-1 leading-relaxed">{insight.message}</p>
    </div>
    {insight.value && (
      <span className="font-mono text-sm font-bold ml-2 flex-shrink-0">{insight.value}</span>
    )}
  </div>
);
