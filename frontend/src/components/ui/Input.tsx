import React from 'react';
import { cn } from '../../lib/utils';
import { Search } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-semibold text-[#70656B] mb-1.5">{label}</label>}
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#70656B] pointer-events-none">{icon}</span>}
      <input
        className={cn(
          'w-full px-3 py-2.5 rounded-[6px] text-base min-h-[44px] outline-none transition-all',
          'bg-[#FFFCF6] text-[#352638] placeholder-[#70656B]',
          'border border-[#96878E]',
          'focus:border-[#AD5138] focus:ring-2 focus:ring-[#AD5138]/20',
          error && 'border-[#963C47] focus:border-[#963C47]',
          icon && 'pl-9',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-[#963C47] mt-1 font-medium">{error}</p>}
  </div>
);

export const SearchInput: React.FC<InputProps> = (props) => (
  <Input icon={<Search size={16} />} {...props} />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-semibold text-[#70656B] mb-1.5">{label}</label>}
    <select
      className={cn(
        'w-full px-3 py-2.5 rounded-[6px] text-base min-h-[44px] outline-none transition-all',
        'bg-[#FFFCF6] text-[#352638]',
        'border border-[#96878E]',
        'focus:border-[#AD5138] focus:ring-2 focus:ring-[#AD5138]/20',
        className
      )}
      {...props}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);
