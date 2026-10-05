import React from 'react';
import { Sidebar } from './layout/Sidebar';
import { BottomNav } from './BottomNav';
import { Toaster } from 'react-hot-toast';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F0E7] text-[#352638]">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F5F0E7]">
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#FFFCF6',
            color: '#352638',
            border: '1px solid #D8CEC4',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'Manrope, sans-serif',
            boxShadow: '0 4px 16px rgba(53, 38, 56, 0.08)',
          },
          success: { iconTheme: { primary: '#435432', secondary: '#FFFCF6' } },
          error:   { iconTheme: { primary: '#963C47', secondary: '#FFFCF6' } },
        }}
      />
    </div>
  );
};
