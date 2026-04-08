import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, className, hover, onClick, style }) => (
  <div
    className={cn('card p-4', hover && 'card-hover cursor-pointer', className)}
    onClick={onClick}
    style={style}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; icon?: React.ReactNode }> = ({ title, subtitle, action, icon }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {icon && <span className="text-gray-400">{icon}</span>}
      <div>
        <h3 className="font-display font-semibold text-white text-base">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}> = ({ title, value, icon, trend, trendUp, color = 'text-forest-400' }) => (
  <Card className="flex items-start gap-4">
    <div className={cn('p-3 rounded-xl bg-white/5 flex-shrink-0', color)}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-400">{title}</p>
      <p className={cn('text-2xl font-display font-bold mt-0.5', color)}>{value}</p>
      {trend && (
        <p className={cn('text-xs mt-1', trendUp ? 'text-forest-400' : 'text-red-400')}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </div>
  </Card>
);
