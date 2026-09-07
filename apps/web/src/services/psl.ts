import { apiGet } from './api/client';

export function fetchPslSeasons(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return apiGet('/psl/seasons', params);
}

export function fetchPslStandings(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return apiGet('/psl/standings', params);
}

export function fetchPslSchedule(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return apiGet('/psl/schedule', params);
}

export function fetchPslLeaders(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return apiGet('/psl/leaders', params);
}

export function fetchPslSquads(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return apiGet('/psl/squads', params);
}
