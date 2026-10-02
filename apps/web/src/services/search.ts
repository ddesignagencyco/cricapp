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

/**
 * Best-effort id for a search row, across the shapes the API has used
 * (`id`, `matchId`, `eventId`, and the snake_case aliases that come back from
 * raw-SQL endpoints). Returns '' when the row carries no usable id, so callers
 * can drop it instead of linking to `/matches/undefined`.
 */
export function searchRowId(row: unknown): string {
  const rec = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>;
  for (const key of ['id', 'matchId', 'eventId', 'match_id', 'event_id']) {
    const raw = rec[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  }
  return '';
}

export async function searchAll(query: string, signal?: AbortSignal): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return emptyResults();

  const params = { q, ...SEARCH_LIMITS };
  const res = signal
    ? await apiGet<SearchResults>('/search', params, { signal })
    : await apiGet<SearchResults>('/search', params);

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
