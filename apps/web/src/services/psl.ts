import { apiGet } from './api/client';

async function asArray(promise: Promise<any>): Promise<any[]> {
  const data = await promise;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.value)) return data.value;
  return data ?? [];
}

export async function fetchPslSeasons(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/seasons', params));
}

export async function fetchPslStandings(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/standings', params));
}

export async function fetchPslSchedule(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/schedule', params));
}

export async function fetchPslLeaders(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/leaders', params));
}

export async function fetchPslSquads(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any[]> {
  return asArray(apiGet('/psl/squads', params));
}
