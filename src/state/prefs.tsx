import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from '../utils/storage';

/*
 * On-device preferences: favourites and alert settings. When accounts
 * land these sync to the API (the website's favourites endpoints).
 */

export interface AlertPrefs {
  matchStart: boolean;
  wickets: boolean;
  milestones: boolean;
  results: boolean;
  breakingNews: boolean;
  predictionSwings: boolean;
}

export type FavouriteKind = 'team' | 'player' | 'match' | 'article' | 'author';

export interface Favourite {
  kind: FavouriteKind;
  id: string;
  /** When it was saved, for "recently saved" ordering. */
  at: number;
}

interface Prefs {
  favourites: Favourite[];
  alerts: AlertPrefs;
  newsLang: 'en' | 'ur';
}

interface PrefsValue extends Prefs {
  isFavourite: (kind: FavouriteKind, id: string) => boolean;
  toggleFavourite: (kind: FavouriteKind, id: string) => void;
  favouritesOf: (kind: FavouriteKind) => string[];
  setAlert: (k: keyof AlertPrefs, v: boolean) => void;
  setNewsLang: (l: 'en' | 'ur') => void;
}

const DEFAULTS: Prefs = {
  favourites: [],
  alerts: { matchStart: true, wickets: true, milestones: false, results: true, breakingNews: true, predictionSwings: false },
  newsLang: 'en',
};

const KEY = 'prefs.v2';
const Ctx = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    storage.get<Prefs>(KEY).then(v => v && setPrefs({ ...DEFAULTS, ...v }));
  }, []);

  const value = useMemo<PrefsValue>(() => {
    const save = (next: Prefs) => {
      setPrefs(next);
      storage.set(KEY, next);
    };
    const has = (kind: FavouriteKind, id: string) => prefs.favourites.some(f => f.kind === kind && f.id === id);
    return {
      ...prefs,
      isFavourite: has,
      toggleFavourite: (kind, id) =>
        save({
          ...prefs,
          favourites: has(kind, id)
            ? prefs.favourites.filter(f => !(f.kind === kind && f.id === id))
            : [{ kind, id, at: Date.now() }, ...prefs.favourites],
        }),
      favouritesOf: kind => prefs.favourites.filter(f => f.kind === kind).map(f => f.id),
      setAlert: (k, v) => save({ ...prefs, alerts: { ...prefs.alerts, [k]: v } }),
      setNewsLang: l => save({ ...prefs, newsLang: l }),
    };
  }, [prefs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePrefs must be used inside PrefsProvider');
  return v;
}
