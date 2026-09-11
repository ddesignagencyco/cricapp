import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { Match } from '../types/index';

export interface MatchTimeline {
  matchId: string;
  payload: Record<string, unknown>;
}

export async function fetchMatches(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<Match[]> {
  const res = await apiGet('/matches', params);
  return extractPage<Match>(res).items;
}

export async function fetchMatchesPage(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<{ items: Match[]; total: number; totalPages: number }> {
  const res = await apiGet('/matches', params);
  const { items, meta } = extractPage<Match>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchLiveMatches(): Promise<Match[]> {
  const res = await apiGet('/matches/live');
  return extractPage<Match>(res).items;
}

export async function fetchMatchById(id: string): Promise<Match | null> {
  return apiGetOptional(`/matches/${id}`);
}

export async function fetchMatchTimeline(id: string): Promise<MatchTimeline | null> {
  return apiGetOptional(`/matches/${id}/timeline`);
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
