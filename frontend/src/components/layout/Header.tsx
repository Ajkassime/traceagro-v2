import React from 'react';
import { Bell, Sun, Moon, Globe, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  backTo?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, children, action, backTo }) => {
  const { theme, toggleTheme, toggleLanguage, language } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header
      className="flex items-center justify-between h-16 px-6 border-b border-white/[0.06] flex-shrink-0"
      style={{ background: 'var(--color-card)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="btn-ghost p-1.5 rounded-lg flex-shrink-0"
            title="Retour"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          {title && <h1 className="page-title text-lg truncate">{title}</h1>}
          {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          {children}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {action && <div className="flex items-center gap-2 mr-2">{action}</div>}
        <button className="btn-ghost p-2" onClick={toggleTheme} title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="btn-ghost p-2 text-xs" onClick={toggleLanguage} title="Changer de langue">
          <Globe size={16} className="mr-1" />
          {language.toUpperCase()}
        </button>
        <button className="btn-ghost p-2 relative" onClick={() => navigate('/notifications')}>
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
};
