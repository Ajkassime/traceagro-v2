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
    className={cn(
      'bg-[#FFFCF6] border border-[#D8CEC4] rounded-[8px] p-6 shadow-sm transition-all duration-150',
      hover && 'cursor-pointer hover:border-[#AD5138] hover:shadow-md active:translate-y-px',
      className
    )}
    onClick={onClick}
    style={style}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, subtitle, action, icon }) => (
  <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#D8CEC4]/60">
    <div className="flex items-center gap-2.5">
      {icon && <span className="text-[#AD5138]">{icon}</span>}
      <div>
        <h3 className="font-serif font-medium text-[#352638] text-base leading-tight">{title}</h3>
        {subtitle && <p className="text-xs text-[#70656B] mt-0.5">{subtitle}</p>}
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
}> = ({ title, value, icon, trend, trendUp, color }) => (
  <Card className="flex items-start gap-4 p-5">
    <div className="p-3 rounded-[6px] bg-[#EAE2EB] text-[#352638] flex-shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#70656B]">{title}</p>
      <p className="text-2xl font-serif font-medium text-[#352638] mt-1">{value}</p>
      {trend && (
        <p className={cn('text-xs mt-1 font-medium', trendUp ? 'text-[#435432]' : 'text-[#963C47]')}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </div>
  </Card>
);
