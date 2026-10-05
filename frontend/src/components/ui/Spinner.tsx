import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div className="flex items-center justify-center p-8">
    <Loader2 size={size} className="animate-spin text-[#352638]" />
  </div>
);

export const PageLoader: React.FC = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={32} className="animate-spin text-[#352638]" />
      <p className="text-sm font-medium text-[#70656B]">Chargement des données…</p>
    </div>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
    {icon && <div className="text-[#AD5138] mb-4 p-4 rounded-full bg-[#EAE2EB]/60">{icon}</div>}
    <p className="font-serif font-medium text-lg text-[#352638] mb-1.5">{title}</p>
    {description && <p className="text-sm text-[#70656B] mb-6 leading-relaxed">{description}</p>}
    {action}
  </div>
);
