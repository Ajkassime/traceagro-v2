import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  className,
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 select-none';
  
  const variants = {
    primary:   'bg-[#352638] text-[#FFFCF6] hover:bg-[#4A354D] active:translate-y-px disabled:bg-[#D8CEC4] disabled:text-[#70656B]',
    secondary: 'bg-transparent border border-[#352638] text-[#352638] hover:bg-[#EAE2EB] active:translate-y-px disabled:border-[#D8CEC4] disabled:text-[#70656B]',
    ghost:     'bg-transparent text-[#352638] hover:bg-[#EAE2EB] active:translate-y-px disabled:text-[#70656B]',
    danger:    'bg-[#963C47] text-[#FFFCF6] hover:bg-[#7C2D38] active:translate-y-px disabled:bg-[#D8CEC4] disabled:text-[#70656B]',
  };

  const sizes = {
    sm: 'text-xs min-h-[36px] px-3 rounded-[6px]',
    md: 'text-sm min-h-[44px] px-[18px] rounded-[6px]',
    lg: 'text-base min-h-[48px] px-6 rounded-[6px]',
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin text-current" />
          <span>Enregistrement…</span>
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
