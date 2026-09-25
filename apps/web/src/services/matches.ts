import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { Match } from '../types/index';

export interface MatchTimeline {
  matchId: string;
  payload: Record<string, unknown>;
}

export interface MatchesListParams {
  [key: string]: string | number | boolean | undefined | null;
  q?: string;
  status?: string;
  tournament?: string;
  page?: number;
  limit?: number;
}

export interface MatchesPageResult {
  items: Match[];
  total: number;
  totalPages: number;
}

export async function fetchMatches(
  params: MatchesListParams = {},
  signal?: AbortSignal
): Promise<Match[]> {
  const res = await apiGet('/matches', params, { signal });
  return extractPage<Match>(res).items;
}

export async function fetchMatchesPage(
  params: MatchesListParams = {},
  signal?: AbortSignal
): Promise<MatchesPageResult> {
  const res = await apiGet('/matches', params, { signal });
  const { items, meta } = extractPage<Match>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchLiveMatches(signal?: AbortSignal): Promise<Match[]> {
  const res = await apiGet('/matches/live', undefined, { signal });
  return extractPage<Match>(res).items;
}

function normalizeMatchId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function fetchMatchById(id: string, signal?: AbortSignal): Promise<Match | null> {
  return apiGetOptional(`/matches/${normalizeMatchId(id)}`, undefined, { signal });
}

export async function fetchMatchTimeline(id: string, signal?: AbortSignal): Promise<MatchTimeline | null> {
  return apiGetOptional(`/matches/${normalizeMatchId(id)}/timeline`, undefined, { signal });
}

export function matchSideIds(match: Match): { home: string; away: string } {
  const teams = match.teams as unknown;
  if (Array.isArray(teams)) {
    return { home: String(teams[0] || ''), away: String(teams[1] || '') };
  }
  if (teams && typeof teams === 'object') {
    const obj = teams as { home?: { teamId?: string; id?: string; code?: string }; away?: { teamId?: string; id?: string; code?: string } };
    return {
      home: String(obj.home?.teamId || obj.home?.id || obj.home?.code || ''),
      away: String(obj.away?.teamId || obj.away?.id || obj.away?.code || ''),
    };
  }
  return { home: '', away: '' };
}
