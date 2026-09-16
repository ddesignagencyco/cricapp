import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { Team, Player, SportEventRecord } from '../types/index';

export async function fetchTeams(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<Team[]> {
  const res = await apiGet('/teams', params);
  return extractPage<Team>(res).items;
}

export async function fetchTeamsPage(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<{ items: Team[]; total: number; totalPages: number }> {
  const res = await apiGet('/teams', params);
  const { items, meta } = extractPage<Team>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchTeamById(idOrAbbr: string): Promise<Team | null> {
  return apiGetOptional(`/teams/${idOrAbbr}`);
}

export async function fetchTeamRosterPage(
  idOrAbbr: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ items: Player[]; total: number; totalPages: number }> {
  const res = await apiGet(`/teams/${idOrAbbr}/players`, { page: 1, limit: 40, ...params });
  const { items, meta } = extractPage<Player>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchTeamRoster(idOrAbbr: string, params: { page?: number; limit?: number } = {}): Promise<Player[]> {
  const res = await fetchTeamRosterPage(idOrAbbr, { page: 1, limit: 100, ...params });
  return res.items;
}

export async function fetchTeamSchedule(
  idOrAbbr: string,
  params: { page?: number; limit?: number } = {}
): Promise<SportEventRecord[]> {
  const res = await apiGet(`/teams/${idOrAbbr}/schedule`, { page: 1, limit: 50, ...params });
  return extractPage<SportEventRecord>(res).items;
}

export async function fetchTeamResults(
  idOrAbbr: string,
  params: { page?: number; limit?: number } = {}
): Promise<SportEventRecord[]> {
  const res = await apiGet(`/teams/${idOrAbbr}/results`, { page: 1, limit: 50, ...params });
  return extractPage<SportEventRecord>(res).items;
}
