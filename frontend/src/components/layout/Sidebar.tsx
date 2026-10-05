import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Ship, FileText, Map,
  Brain, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  Factory, Building2, ClipboardList
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { cn } from '../../lib/utils';

const nav = [
  { to: '/dashboard',       icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/lots',            icon: Package,          label: 'Lots' },
  { to: '/producers',       icon: Users,            label: 'Producteurs' },
  { to: '/clients',         icon: Building2,        label: 'Clients' },
  { to: '/purchase-orders', icon: ClipboardList,    label: 'Bons de commande' },
  { to: '/shipments',       icon: Ship,             label: 'Expéditions' },
  { to: '/documents',       icon: FileText,         label: 'Documents' },
  { to: '/conditioning',    icon: Factory,          label: 'Conditionnement' },
  { to: '/map',             icon: Map,              label: 'Cartographie' },
];

const navBottom = [
  { to: '/intelligence',  icon: Brain,    label: 'Intelligence' },
  { to: '/notifications', icon: Bell,     label: 'Notifications' },
  { to: '/settings',      icon: Settings, label: 'Paramètres' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 transition-all duration-200 border-r bg-[#FFFCF6] border-[#D8CEC4] select-none z-20',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* ── En-tête Marque ── */}
      <div
        className={cn(
          'flex items-center h-20 px-4 border-b border-[#D8CEC4]',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[6px] bg-[#352638] flex items-center justify-center text-[#FFFCF6] font-serif font-semibold text-lg flex-shrink-0 shadow-sm">
            TA
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <span className="font-serif font-medium text-[#352638] text-base block tracking-tight truncate">
                TraceAgro
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#AD5138]">
                Terre & Registre
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Filet fin argile ── */}
      <div className="h-[2px] bg-[#AD5138]" />

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-2.5 overflow-y-auto space-y-6">
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#70656B]">
              Registre
            </p>
          )}
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-[#EAE2EB] text-[#352638] font-bold shadow-xs'
                      : 'text-[#70656B] hover:text-[#352638] hover:bg-[#F5F0E7]'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {/* Repère distinct citron confit lors de la sélection */}
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#D8DF72] rounded-r" />
                      )}
                      <item.icon size={19} className={cn('flex-shrink-0', isActive ? 'text-[#352638]' : 'text-[#70656B]')} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[#D8CEC4]/70 pt-4">
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#70656B]">
              Outils
            </p>
          )}
          <ul className="space-y-1">
            {navBottom.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-[#EAE2EB] text-[#352638] font-bold shadow-xs'
                      : 'text-[#70656B] hover:text-[#352638] hover:bg-[#F5F0E7]'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#D8DF72] rounded-r" />
                      )}
                      <item.icon size={19} className={cn('flex-shrink-0', isActive ? 'text-[#352638]' : 'text-[#70656B]')} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Utilisateur et repli ── */}
      <div className="border-t border-[#D8CEC4] p-3 bg-[#FFFCF6]">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-[6px] bg-[#F5F0E7]">
            <div className="w-8 h-8 rounded-full bg-[#352638] text-[#FFFCF6] font-semibold text-xs flex items-center justify-center flex-shrink-0">
              {user?.firstName?.[0] || 'A'}{user?.lastName?.[0] || 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#352638] truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-[#70656B] truncate capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-[6px] text-xs font-semibold text-[#70656B] hover:text-[#963C47] hover:bg-[#F8E6E8] transition-colors flex-1',
              collapsed ? 'justify-center' : ''
            )}
            title="Déconnexion"
          >
            <LogOut size={16} />
            {!collapsed && <span>Déconnexion</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-[6px] text-[#70656B] hover:text-[#352638] hover:bg-[#EAE2EB] transition-colors"
            aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
};
