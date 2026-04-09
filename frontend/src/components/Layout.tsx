import React from 'react';
import { Sidebar } from './layout/Sidebar';
import { BottomNav } from './BottomNav';
import { Toaster } from 'react-hot-toast';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden">
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
            background: '#202b40',
            color: '#e7e9ef',
            border: '1px solid rgba(201,146,58,0.2)',
            fontSize: 13,
            fontFamily: 'Poppins, sans-serif',
          },
          success: { iconTheme: { primary: '#1e5c6e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ff5724', secondary: '#fff' } },
        }}
      />
    </div>
  );
};
