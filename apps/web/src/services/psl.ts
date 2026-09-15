import { apiGet, extractPage } from './api/client';
import type { PslSeason, PointsRow, PslSchedule, LeaderGroup, PslSquad } from '../types/index';

const ALL = { limit: 100 };

export async function fetchPslSeasons(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<PslSeason[]> {
  const res = await apiGet('/psl/seasons', { ...ALL, ...params });
  return extractPage<PslSeason>(res).items;
}

export async function fetchPslStandings(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<PointsRow[]> {
  const res = await apiGet('/psl/standings', { ...ALL, ...params });
  return extractPage<PointsRow>(res).items;
}

export async function fetchPslSchedule(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<PslSchedule[]> {
  const res = await apiGet('/psl/schedule', { ...ALL, ...params });
  return extractPage<PslSchedule>(res).items;
}

export async function fetchPslLeaders(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<LeaderGroup[]> {
  const res = await apiGet('/psl/leaders', { ...ALL, ...params });
  return extractPage<LeaderGroup>(res).items;
}

export async function fetchPslSquads(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<PslSquad[]> {
  const res = await apiGet('/psl/squads', { ...ALL, ...params });
  return extractPage<PslSquad>(res).items;
}
