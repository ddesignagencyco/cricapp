import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, StatusBar, useColorScheme } from 'react-native';
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
    storage.get<ThemePreference>(KEY).then(v => v && setPref(v));
  }, []);

  // Drive the native night mode too, so system UI and cold start match the choice.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const value = useMemo<ThemeValue>(() => {
    const isDark =
      preference === 'system' ? system !== 'light' : preference === 'dark';
    return {
      colors: isDark ? dark : light,
      isDark,
      preference,
      setPreference: p => {
        setPref(p);
        storage.set(KEY, p);
      },
    };
  }, [preference, system]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar
        barStyle={value.isDark ? 'light-content' : 'dark-content'}
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
