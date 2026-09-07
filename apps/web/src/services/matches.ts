import { apiGet } from './api/client';
import { MatchSummary } from '../types/index';

export function fetchMatches(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<MatchSummary[]> {
  return apiGet('/matches', params);
}

export function fetchLiveMatches(): Promise<MatchSummary[]> {
  return apiGet('/matches/live');
}

export async function fetchMatchById(id: string): Promise<MatchSummary | null> {
  return apiGet(`/matches/${id}`);
}

export async function fetchMatchTimeline(id: string): Promise<any> {
  return apiGet(`/matches/${id}/timeline`);
}
