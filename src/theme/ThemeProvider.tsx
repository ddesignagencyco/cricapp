import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { dark, light, type Palette } from './colors';
import { storage } from '../utils/storage';

export type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeValue {
  colors: Palette;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const KEY = 'pref.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    storage.get<ThemePreference>(KEY).then(v => {
      if (v === 'dark' || v === 'light' || v === 'system') setPref(v);
    });
  }, []);

  // Avoid calling Appearance.setColorScheme on Android: it triggers a native
  // AppCompatDelegate night-mode activity reconfiguration that freezes the UI
  // thread for 1–2s. ThemeContext + StatusBar handle instant switching cleanly.
  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    storage.set(KEY, p);
  }, []);

  const isDark =
    preference === 'system' ? system !== 'light' : preference === 'dark';

  const value = useMemo<ThemeValue>(
    () => ({
      colors: isDark ? dark : light,
      isDark,
      preference,
      setPreference,
    }),
    [isDark, preference, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
