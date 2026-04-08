import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <div className="flex items-center justify-center p-8">
    <Loader2 size={size} className="animate-spin text-forest-500" />
  </div>
);

export const PageLoader: React.FC = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={32} className="animate-spin text-forest-500" />
      <p className="text-sm text-gray-500">Chargement...</p>
    </div>
  </div>
);

export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode }> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon && <div className="text-gray-600 mb-4">{icon}</div>}
    <p className="font-display font-semibold text-white mb-1">{title}</p>
    {description && <p className="text-sm text-gray-500 mb-4 max-w-xs">{description}</p>}
    {action}
  </div>
);
