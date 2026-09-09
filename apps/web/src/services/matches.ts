import { apiGet, extractPage } from './api/client';
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
): Promise<{ items: Match[]; total: number }> {
  const res = await apiGet('/matches', params);
  const { items, meta } = extractPage<Match>(res);
  return { items, total: meta.total };
}

export async function fetchLiveMatches(): Promise<Match[]> {
  const res = await apiGet('/matches/live');
  return extractPage<Match>(res).items;
}

export async function fetchMatchById(id: string): Promise<Match | null> {
  return apiGet(`/matches/${id}`);
}

export async function fetchMatchTimeline(id: string): Promise<MatchTimeline | null> {
  return apiGet(`/matches/${id}/timeline`);
}
