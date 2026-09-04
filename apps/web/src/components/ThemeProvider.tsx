'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

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
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('pak-criczone-theme');
    const preferred = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.classList.toggle('light', preferred === 'light');
    return preferred;
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pak-criczone-theme', next);
      document.documentElement.classList.toggle('light', next === 'light');
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}
