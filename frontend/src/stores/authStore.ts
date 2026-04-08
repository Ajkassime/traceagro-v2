import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  theme: 'dark' | 'light';
  language: 'fr' | 'en';
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  toggleTheme: () => void;
  toggleLanguage: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      theme: 'dark',
      language: 'fr',

      setAuth: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false }),

      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'dark' ? 'light' : 'dark';
          document.documentElement.classList.toggle('light', newTheme === 'light');
          return { theme: newTheme };
        }),

      toggleLanguage: () =>
        set((state) => ({ language: state.language === 'fr' ? 'en' : 'fr' })),
    }),
    { name: 'traceagro-auth' }
  )
);
