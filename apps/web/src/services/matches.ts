import { apiGet } from './api/client';
import { MatchSummary } from '../types/index';
import { demoMatches, getDemoTimeline } from '../data/demo';

async function asArray(promise: Promise<any>, demo: any[]): Promise<any[]> {
  const data = await promise;
  if (Array.isArray(data) && data.length > 0) return data;
  if (data && Array.isArray(data.value) && data.value.length > 0) return data.value;
  return demo;
}

export function fetchMatches(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<MatchSummary[]> {
  return asArray(apiGet('/matches', params), demoMatches);
}

export function fetchLiveMatches(): Promise<MatchSummary[]> {
  return asArray(apiGet('/matches/live'), demoMatches.filter((m) => m.status === 'live'));
}

export async function fetchMatchById(id: string): Promise<MatchSummary | null> {
  const data = await apiGet(`/matches/${id}`);
  if (data) return data;
  return demoMatches.find((m) => m.matchId === id) || null;
}

export async function fetchMatchTimeline(id: string): Promise<any> {
  const data = await apiGet(`/matches/${id}/timeline`);
  if (data && data.matchId && data.payload) return data;
  const demo = getDemoTimeline(id);
  return demo ? { matchId: id, payload: demo.payload } : null;
}