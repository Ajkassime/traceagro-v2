import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Ship, FileText, Map,
  Brain, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  Zap, Factory
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

const nav = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/lots',         icon: Package,          label: 'Lots' },
  { to: '/producers',    icon: Users,            label: 'Producteurs' },
  { to: '/shipments',    icon: Ship,             label: 'Expéditions' },
  { to: '/documents',    icon: FileText,         label: 'Documents' },
  { to: '/conditioning', icon: Factory,          label: 'Conditionnement' },
  { to: '/map',          icon: Map,              label: 'Cartographie' },
];

const navBottom = [
  { to: '/intelligence',  icon: Brain,    label: 'Intelligence IA', highlight: true },
  { to: '/notifications', icon: Bell,     label: 'Notifications' },
  { to: '/settings',      icon: Settings, label: 'Paramètres' },
];

/* ── Inline SVG logo (no external file needed) ── */
const APLLogo: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : '')}>
    {/* Icon mark — vanilla flower placeholder styled with APL colors */}
    <div
      className="flex-shrink-0 rounded-lg flex items-center justify-center"
      style={{
        width: collapsed ? 36 : 36,
        height: collapsed ? 36 : 36,
        background: 'linear-gradient(135deg, #1e5c6e 50%, #c9923a 100%)',
        boxShadow: '0 2px 8px rgba(30,92,110,0.4)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C12 2 7 6 7 11C7 13.76 9.24 16 12 16C14.76 16 17 13.76 17 11C17 6 12 2 12 2Z" fill="white" fillOpacity="0.9"/>
        <path d="M12 16V22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <path d="M9 19H15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="10" r="2.5" fill="#c9923a"/>
      </svg>
    </div>
    {!collapsed && (
      <div className="leading-tight">
        <p className="font-bold text-white text-sm tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}>
          APL Vanilla
        </p>
        <p className="text-xs font-medium" style={{ color: '#c9923a', letterSpacing: '0.05em' }}>
          TraceAgro · v2
        </p>
      </div>
    )}
  </div>
);

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 transition-all duration-300 border-r',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{
        background: 'var(--color-sidebar)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b',
          collapsed ? 'justify-center' : ''
        )}
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <APLLogo collapsed={collapsed} />
      </div>

      {/* ── Gold accent line ── */}
      <div style={{
        height: '2px',
        background: 'linear-gradient(90deg, #c9923a, #e0aa55, transparent)',
      }} />

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {!collapsed && (
          <p className="section-label px-4 mb-2">Navigation</p>
        )}
        <ul className="space-y-0.5 px-2">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  collapsed ? 'justify-center' : '',
                  isActive
                    ? 'text-white border'
                    : 'hover:bg-white/5 hover:text-white'
                )}
                style={({ isActive }) => isActive ? {
                  background: 'rgba(30,92,110,0.2)',
                  borderColor: 'rgba(30,92,110,0.35)',
                  color: '#2a7a90',
                } : { color: 'var(--color-navy-300)' }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="my-3 mx-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />

        {!collapsed && <p className="section-label px-4 mb-2">Outils</p>}
        <ul className="space-y-0.5 px-2">
          {navBottom.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  collapsed ? 'justify-center' : '',
                  isActive
                    ? 'text-white border'
                    : ''
                )}
                style={({ isActive }) => isActive ? {
                  background: 'rgba(30,92,110,0.2)',
                  borderColor: 'rgba(30,92,110,0.35)',
                  color: '#2a7a90',
                } : item.highlight ? {
                  color: '#c9923a',
                } : {
                  color: 'var(--color-navy-300)',
                }}
                title={collapsed ? item.label : undefined}
              >
                {item.highlight
                  ? <><Zap size={18} className="flex-shrink-0" />{!collapsed && <span>{item.label}</span>}</>
                  : <><item.icon size={18} className="flex-shrink-0" />{!collapsed && <span>{item.label}</span>}</>
                }
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── User + collapse ── */}
      <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1e5c6e, #c9923a)' }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-navy-400)' }}>
                {user?.role}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all flex-1',
              collapsed ? 'justify-center' : ''
            )}
            style={{ color: 'var(--color-navy-400)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#ff5724';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,87,36,0.1)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-navy-400)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <LogOut size={16} />
            {!collapsed && <span>Déconnexion</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--color-navy-400)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-navy-400)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
};
