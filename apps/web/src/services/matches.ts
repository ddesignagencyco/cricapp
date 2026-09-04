import { apiGet } from './api/client';
import { MatchSummary } from '../types/index';

export function fetchMatches(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<MatchSummary[] | null> {
  return apiGet('/matches', params);
}

export function fetchLiveMatches(): Promise<MatchSummary[] | null> {
  return apiGet('/matches/live');
}

export function fetchMatchById(id: string): Promise<MatchSummary | null> {
  return apiGet(`/matches/${id}`);
}
