import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Ship, Factory, Settings
} from 'lucide-react';
import { cn } from '../lib/utils';

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Tableau' },
  { to: '/lots',         icon: Package,          label: 'Lots' },
  { to: '/producers',    icon: Users,            label: 'Producteurs' },
  { to: '/shipments',    icon: Ship,             label: 'Expéditions' },
  { to: '/conditioning', icon: Factory,          label: 'Atelier' },
  { to: '/settings',     icon: Settings,         label: 'Réglages' },
];

export const BottomNav: React.FC = () => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFCF6] border-t border-[#D8CEC4] shadow-md"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Filet décoratif argile discret */}
      <div className="h-[2px] bg-[#AD5138]" />

      <div className="flex items-stretch justify-around px-2 py-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              'flex-1 flex flex-col items-center justify-center py-2 px-1 text-center transition-all duration-150 relative',
              isActive ? 'text-[#352638]' : 'text-[#70656B]'
            )}
          >
            {({ isActive }) => (
              <>
                {/* Repère citron confit mobile */}
                {isActive && (
                  <span className="absolute top-0 w-8 h-[3px] bg-[#D8DF72] rounded-b-sm" />
                )}
                <div
                  className={cn(
                    'p-1.5 rounded-[6px] transition-all',
                    isActive ? 'bg-[#EAE2EB] text-[#352638]' : ''
                  )}
                >
                  <item.icon size={20} />
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-0.5 leading-tight font-sans',
                    isActive ? 'font-bold text-[#352638]' : 'font-medium text-[#70656B]'
                  )}
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
