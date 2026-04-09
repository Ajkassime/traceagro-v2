import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Ship, Factory, Settings
} from 'lucide-react';
import { cn } from '../lib/utils';

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lots',         icon: Package,          label: 'Lots' },
  { to: '/producers',    icon: Users,            label: 'Producteurs' },
  { to: '/shipments',    icon: Ship,             label: 'Expéditions' },
  { to: '/conditioning', icon: Factory,          label: 'Conditionn.' },
  { to: '/settings',     icon: Settings,         label: 'Paramètres' },
];

export const BottomNav: React.FC = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{
        background: 'var(--color-sidebar)',
        borderColor: 'rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Gold accent line at top */}
      <div style={{
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #c9923a, #e0aa55, #c9923a, transparent)',
      }} />

      <div className="flex items-stretch">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-1 text-center transition-all duration-150"
            style={({ isActive }) => isActive ? {
              color: '#2a7a90',
            } : {
              color: 'var(--color-navy-400)',
            }}
          >
            {({ isActive }) => (
              <>
                <div
                  className="p-1.5 rounded-lg transition-all duration-150"
                  style={isActive ? {
                    background: 'rgba(30,92,110,0.18)',
                  } : {}}
                >
                  <item.icon size={20} />
                </div>
                <span
                  className="text-[10px] font-medium leading-tight"
                  style={isActive ? { color: '#2a7a90' } : {}}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
