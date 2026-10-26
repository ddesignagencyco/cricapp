import { colorFor } from '../utils/color';
import type { Author, Player, Series, Team, Venue } from './types';

/*
 * Synchronous entity lookups, filled from API responses as they arrive
 * (see data/adapt.ts). Screens resolve ids here so they never block on a
 * fetch; anything not seen yet falls back to a neutral placeholder.
 */

const teams = new Map<string, Team>();
const players = new Map<string, Player>();
const series = new Map<string, Series>();
const venues = new Map<string, Venue>();
const authors = new Map<string, Author>();

/** Brand colours for teams people know by colour. Everyone else gets a stable colour from their name. */
const KNOWN: Record<string, { color: string; flag?: string; kind?: Team['kind'] }> = {
  Pakistan: { color: '#1FB86A', flag: '🇵🇰' },
  India: { color: '#3E8BFF', flag: '🇮🇳' },
  Australia: { color: '#F5C518', flag: '🇦🇺' },
  England: { color: '#E8475F' },
  'New Zealand': { color: '#0E8A8F', flag: '🇳🇿' },
  'South Africa': { color: '#F2B705', flag: '🇿🇦' },
  'Sri Lanka': { color: '#4F7BFF', flag: '🇱🇰' },
  Bangladesh: { color: '#20A363', flag: '🇧🇩' },
  Afghanistan: { color: '#4C8DF6', flag: '🇦🇫' },
  'West Indies': { color: '#B33A5B' },
  Zimbabwe: { color: '#D94B3C', flag: '🇿🇼' },
  Ireland: { color: '#2FA866', flag: '🇮🇪' },
  'Lahore Qalandars': { color: '#35C15B', kind: 'franchise' },
  'Karachi Kings': { color: '#2F7DF0', kind: 'franchise' },
  'Islamabad United': { color: '#F0474B', kind: 'franchise' },
  'Peshawar Zalmi': { color: '#F7C600', kind: 'franchise' },
  'Quetta Gladiators': { color: '#9A5CF0', kind: 'franchise' },
  'Multan Sultans': { color: '#22C3AE', kind: 'franchise' },
  'Hyderabad Kingsmen': { color: '#E0782F', kind: 'franchise' },
  'Rawalpindi Pindiz': { color: '#C2417A', kind: 'franchise' },
};

/** PSL crests, the same files the website shows (cric_info/apps/web/src/utils/helpers.ts). */
const PSL_LOGOS: Record<string, string> = {
  'Islamabad United': 'https://psl-t20.com/wp-content/uploads/2016/01/psl-islamabad-united.png',
  'Hyderabad Kingsmen': 'https://psl-t20.com/wp-content/uploads/2026/03/Hyderabad-Kingsmen-logo-1.png',
  'Karachi Kings': 'https://psl-t20.com/wp-content/uploads/2017/02/psl-karachi-kings.png',
  'Lahore Qalandars': 'https://psl-t20.com/wp-content/uploads/2016/01/psl-lahore-qalandars.png',
  'Multan Sultans': 'https://psl-t20.com/wp-content/uploads/2019/01/psl-multan-sultan.png',
  'Peshawar Zalmi': 'https://psl-t20.com/wp-content/uploads/2016/01/psl-peshawar-zalmi.png',
  'Quetta Gladiators': 'https://psl-t20.com/wp-content/uploads/2017/02/psl-quetta-gladiators.png',
  'Rawalpindi Pindiz': 'https://psl-t20.com/wp-content/uploads/2026/03/Rawalpindiz-Logo.png',
};

const FULL_MEMBERS = new Set(Object.keys(KNOWN).filter(n => !KNOWN[n].kind));

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Register (or enrich) a team. Later calls fill in fields earlier ones lacked. */
export function rememberTeam(t: { id: string; name: string; short?: string; kind?: Team['kind']; logoUrl?: string | null }): Team {
  const prev = teams.get(t.id);
  const name = t.name || prev?.name || 'TBC';
  const known = KNOWN[name];
  const next: Team = {
    id: t.id,
    name,
    short: t.short || prev?.short || name.slice(0, 3).toUpperCase(),
    color: known?.color ?? prev?.color ?? colorFor(name),
    kind: t.kind ?? known?.kind ?? prev?.kind ?? (FULL_MEMBERS.has(name) ? 'international' : 'domestic'),
    flag: known?.flag ?? prev?.flag,
    slug: slugify(name),
    logoUrl: t.logoUrl ?? prev?.logoUrl ?? PSL_LOGOS[name],
  };
  teams.set(t.id, next);
  return next;
}

/** Register a player, keeping richer details a profile fetch already stored. */
export function rememberPlayer(p: Player): Player {
  const prev = players.get(p.id);
  const next: Player = prev
    ? {
        ...p,
        teamId: p.teamId || prev.teamId,
        born: p.born ?? prev.born,
        age: p.age ?? prev.age,
        bowling: p.bowling ?? prev.bowling,
        batting: p.batting || prev.batting,
        nationality: p.nationality ?? prev.nationality,
      }
    : p;
  players.set(p.id, next);
  return next;
}

export function rememberSeries(s: Series): Series {
  const next = { ...series.get(s.id), ...s };
  series.set(s.id, next);
  return next;
}

export function rememberVenue(v: Venue): Venue {
  venues.set(v.id, v);
  return v;
}

export function rememberAuthor(name: string): Author {
  const id = slugify(name) || 'desk';
  const a: Author = {
    id,
    name,
    role: 'Staff writer',
    initials: name
      .split(/\s+/)
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  };
  authors.set(id, a);
  return a;
}

const unknownTeam = (id: string): Team => ({ id, name: 'TBC', short: 'TBC', color: '#3B68FC', kind: 'domestic', slug: 'tbc' });

export const team = (id: string): Team => teams.get(id) ?? unknownTeam(id);
export const player = (id: string): Player | undefined => players.get(id);
export const playerName = (id: string) => players.get(id)?.name ?? id;
export const playerShort = (id: string) => players.get(id)?.short ?? id;
export const seriesOf = (id: string): Series | undefined => series.get(id);
export const venue = (id: string): Venue | undefined => venues.get(id);
export const author = (id: string): Author | undefined => authors.get(id);
/** "Lord's, London" with whatever parts are known; empty when the venue isn't. */
export const venueLabel = (id: string) => {
  const v = venues.get(id);
  return v ? [v.name, v.city].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(', ') : '';
};

/** Everything seen so far (search, compare pickers). */
export const allTeams = () => [...teams.values()];
export const allPlayers = () => [...players.values()];
export const allSeries = () => [...series.values()];
