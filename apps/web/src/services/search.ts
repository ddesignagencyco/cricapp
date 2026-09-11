import { apiGet } from './api/client';
import type { Match, Player, SearchResults, Team, TournamentApi } from '../types/index';

const emptyResults = (): SearchResults => ({ players: [], teams: [], matches: [], tournaments: [] });

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const SEARCH_LIMITS = {
  playerLimit: 20,
  teamLimit: 20,
  matchLimit: 20,
  tournamentLimit: 20,
} as const;

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return emptyResults();

  const res = await apiGet<SearchResults>('/search', {
    q,
    ...SEARCH_LIMITS,
  });

  const players = asArray<Player>(res?.players).map((p: any) => {
    const displayName = p.name || p.fullName || p.shortName || 'Player';
    return {
      ...p,
      name: displayName,
      fullName: p.fullName || displayName,
      teamName: p.teamName || p.team?.name || p.team?.abbr || '',
      role: p.role || '',
    };
  });

  return {
    players,
    teams: asArray<Team>(res?.teams),
    matches: asArray<Match>(res?.matches),
    tournaments: asArray<TournamentApi>(res?.tournaments),
  };
}
