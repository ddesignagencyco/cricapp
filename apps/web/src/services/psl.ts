import { apiGet } from './api/client';
import { demoPslSeasons, demoPslStandings, demoPslSchedule, demoPslLeaders, demoPslSquads } from '../data/demo';

async function asArray(promise: Promise<any>, demo: any[]): Promise<any[]> {
  const data = await promise;
  if (Array.isArray(data) && data.length > 0) return data;
  if (data && Array.isArray(data.value) && data.value.length > 0) return data.value;
  return demo;
}

export function fetchPslSeasons(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/seasons', params), demoPslSeasons);
}

export function fetchPslStandings(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/standings', params), demoPslStandings);
}

export function fetchPslSchedule(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/schedule', params), demoPslSchedule);
}

export function fetchPslLeaders(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/leaders', params), demoPslLeaders);
}

export function fetchPslSquads(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/squads', params), demoPslSquads);
}