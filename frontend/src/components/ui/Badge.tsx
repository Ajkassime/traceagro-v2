import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, color, bg, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none border border-transparent',
      color,
      bg,
      className
    )}
  >
    {children}
  </span>
);

// Status badge conforme charte Terre & Registre
export const StatusBadge: React.FC<{ config: { label: string; color?: string; bg?: string; symbol?: string } }> = ({ config }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        config.bg || 'bg-[#EAE2EB]',
        config.color || 'text-[#352638]',
        'border-current/20'
      )}
    >
      {config.symbol && <span className="font-bold text-[11px]">{config.symbol}</span>}
      <span>{config.label}</span>
    </span>
  );
};

// Score badge avec repères clairs
export const ScoreBadge: React.FC<{ score?: number | null }> = ({ score }) => {
  if (score === null || score === undefined) {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-[#EAE2EB] text-[#70656B]">—</span>;
  }
  
  // Règle charte : Vérifié / À contrôler / Erreur
  const isHigh = score >= 8;
  const isMed = score >= 6;
  
  const style = isHigh
    ? 'bg-[#E5ECD9] text-[#435432] border-[#435432]/30'
    : isMed
    ? 'bg-[#F5E8CC] text-[#795015] border-[#795015]/30'
    : 'bg-[#F8E6E8] text-[#963C47] border-[#963C47]/30';

  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border', style)}>
      {isHigh ? '✓ ' : isMed ? '▲ ' : '⚠ '}
      {score.toFixed(1)}/10
    </span>
  );
};
