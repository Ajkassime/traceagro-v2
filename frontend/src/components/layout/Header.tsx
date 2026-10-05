import React from 'react';
import { Bell, Globe, ArrowLeft } from 'lucide-react';
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
  const { toggleLanguage, language } = useAuthStore();
  const navigate = useNavigate();

  return (
    <header
      className="flex items-center justify-between h-20 px-6 sm:px-8 border-b border-[#D8CEC4] bg-[#FFFCF6] flex-shrink-0 z-10"
    >
      <div className="flex items-center gap-4 min-w-0">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="p-2 rounded-[6px] text-[#70656B] hover:text-[#352638] hover:bg-[#EAE2EB] transition-colors flex-shrink-0"
            title="Retour"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          {title && <h1 className="page-title text-xl sm:text-2xl truncate">{title}</h1>}
          {subtitle && <p className="text-xs font-medium text-[#70656B] truncate mt-0.5">{subtitle}</p>}
          {children}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {action && <div className="flex items-center gap-2 mr-1">{action}</div>}

        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-xs font-semibold text-[#352638] hover:bg-[#EAE2EB] transition-colors border border-[#D8CEC4]"
          onClick={toggleLanguage}
          title="Changer de langue"
          aria-label="Changer de langue"
        >
          <Globe size={15} className="text-[#AD5138]" />
          <span>{language.toUpperCase()}</span>
        </button>

        <button
          className="p-2.5 rounded-[6px] text-[#352638] hover:bg-[#EAE2EB] transition-colors border border-[#D8CEC4] relative"
          onClick={() => navigate('/notifications')}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#AD5138]" />
        </button>
      </div>
    </header>
  );
};
