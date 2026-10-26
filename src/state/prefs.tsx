import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { player, rememberPlayer, rememberTeam, team } from '../data/refs';
import { storage } from '../utils/storage';

/*
 * On-device preferences: favourites and news language. Favourites keep the
 * name they were saved with, so lists can show them before any fetch.
 */

export type FavouriteKind = 'team' | 'player' | 'match' | 'article' | 'author';

export interface Favourite {
  kind: FavouriteKind;
  id: string;
  /** When it was saved, for "recently saved" ordering. */
  at: number;
  /** Display name and code at save time (teams and players). */
  name?: string;
  short?: string;
  teamId?: string;
}

interface Prefs {
  favourites: Favourite[];
  newsLang: 'en' | 'ur';
}

interface PrefsValue extends Prefs {
  isFavourite: (kind: FavouriteKind, id: string) => boolean;
  toggleFavourite: (kind: FavouriteKind, id: string) => void;
  favouritesOf: (kind: FavouriteKind) => string[];
  setNewsLang: (l: 'en' | 'ur') => void;
}

const DEFAULTS: Prefs = {
  favourites: [],
  newsLang: 'en',
};

const KEY = 'prefs.v2';

/** Ids from the API look like "sr:competitor:…", "code:…" or a UUID; anything else is left over from the sample-data build. */
const realId = (f: Favourite) => /:/.test(f.id) || /^[0-9a-f-]{36}$/i.test(f.id);

/** Put saved names back in the lookup tables so favourites render before any fetch. */
function restore(list: Favourite[]) {
  for (const f of list) {
    if (f.kind === 'team' && f.name) rememberTeam({ id: f.id, name: f.name, short: f.short });
    if (f.kind === 'player' && f.name && !player(f.id)) {
      rememberPlayer({ id: f.id, name: f.name, short: f.short ?? f.name, teamId: f.teamId ?? '', role: 'Player', batting: '', slug: f.id, stats: {}, recent: [] });
    }
  }
}
const Ctx = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    storage.get<Prefs>(KEY).then(v => {
      if (!v) return;
      const favourites = (v.favourites ?? []).filter(realId);
      restore(favourites);
      setPrefs({ favourites, newsLang: v.newsLang ?? DEFAULTS.newsLang });
    });
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
            : [{ kind, id, at: Date.now(), ...describe(kind, id) }, ...prefs.favourites],
        }),
      favouritesOf: kind => prefs.favourites.filter(f => f.kind === kind).map(f => f.id),
      setNewsLang: l => save({ ...prefs, newsLang: l }),
    };
  }, [prefs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Name to keep with a new favourite. */
function describe(kind: FavouriteKind, id: string): Partial<Favourite> {
  if (kind === 'team') {
    const t = team(id);
    return t.name === 'TBC' ? {} : { name: t.name, short: t.short };
  }
  if (kind === 'player') {
    const p = player(id);
    return p ? { name: p.name, short: p.short, teamId: p.teamId } : {};
  }
  return {};
}

export function usePrefs() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePrefs must be used inside PrefsProvider');
  return v;
}
