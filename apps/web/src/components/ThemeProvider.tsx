'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppSkeletonTheme } from './skeletons/Skeletons';

interface ThemeContextValue {
  theme: string;
  toggle: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggle: () => {}, mounted: false });

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('pak-criczone-theme');
    const preferred = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.classList.toggle('light', preferred === 'light');
    document.documentElement.style.colorScheme = preferred;
    setTheme(preferred);
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pak-criczone-theme', next);
      document.documentElement.classList.toggle('light', next === 'light');
      document.documentElement.style.colorScheme = next;
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, mounted }}>
      <AppSkeletonTheme>{children}</AppSkeletonTheme>
    </ThemeContext.Provider>
  );
}
