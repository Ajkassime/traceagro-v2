import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps { children: React.ReactNode; color?: string; bg?: string; className?: string; }

export const Badge: React.FC<BadgeProps> = ({ children, color, bg, className }) => (
  <span className={cn('badge', color, bg, className)}>{children}</span>
);

// Status badge
export const StatusBadge: React.FC<{ config: { label: string; color: string; bg: string } }> = ({ config }) => (
  <Badge color={config.color} bg={config.bg}>{config.label}</Badge>
);

// Score badge
export const ScoreBadge: React.FC<{ score?: number | null }> = ({ score }) => {
  if (!score) return <span className="badge bg-gray-700 text-gray-400">—</span>;
  const color = score >= 8 ? 'text-forest-400 bg-forest-500/10' : score >= 6 ? 'text-vanilla-400 bg-vanilla-500/10' : 'text-red-400 bg-red-500/10';
  return <span className={cn('badge font-mono', color)}>{score.toFixed(1)}/10</span>;
};
