import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Ship, FileText, Map,
  Brain, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  Leaf, Zap, Factory
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lots', icon: Package, label: 'Lots' },
  { to: '/producers', icon: Users, label: 'Producteurs' },
  { to: '/shipments', icon: Ship, label: 'Expéditions' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/conditioning', icon: Factory, label: 'Conditionnement' },
  { to: '/map', icon: Map, label: 'Cartographie' },
];

const navBottom = [
  { to: '/intelligence', icon: Brain, label: 'Intelligence IA', highlight: true },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/settings', icon: Settings, label: 'Paramètres' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 transition-all duration-300 border-r border-white/[0.06]',
        collapsed ? 'w-16' : 'w-60',
        'bg-sidebar'
      )}
      style={{ background: 'var(--color-sidebar)' }}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-white/[0.06]', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center flex-shrink-0">
          <Leaf size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-display font-bold text-white text-sm leading-tight">TraceAgro</p>
            <p className="text-[10px] text-vanilla-500 font-medium">APL v2</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {!collapsed && <p className="section-label px-4 mb-2">Navigation</p>}
        <ul className="space-y-0.5 px-2">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    collapsed ? 'justify-center' : '',
                    isActive
                      ? 'bg-forest-600/20 text-forest-400 border border-forest-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="my-3 mx-4 border-t border-white/[0.06]" />
        {!collapsed && <p className="section-label px-4 mb-2">Outils</p>}
        <ul className="space-y-0.5 px-2">
          {navBottom.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    collapsed ? 'justify-center' : '',
                    item.highlight && !isActive ? 'text-vanilla-400 hover:text-vanilla-300 hover:bg-vanilla-500/10' : '',
                    isActive
                      ? 'bg-forest-600/20 text-forest-400 border border-forest-600/30'
                      : !item.highlight ? 'text-gray-400 hover:text-white hover:bg-white/5' : ''
                  )
                }
                title={collapsed ? item.label : undefined}
              >
                {item.highlight && !collapsed
                  ? <><Zap size={18} className="flex-shrink-0" /><span>{item.label}</span></>
                  : <><item.icon size={18} className="flex-shrink-0" />{!collapsed && <span>{item.label}</span>}</>
                }
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + collapse */}
      <div className="border-t border-white/[0.06] p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-2">
            <div className="w-8 h-8 rounded-full bg-forest-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={handleLogout}
            className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all flex-1', collapsed ? 'justify-center' : '')}
          >
            <LogOut size={16} />
            {!collapsed && <span>Déconnexion</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
};
