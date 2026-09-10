import { apiGet, extractPage } from './api/client';
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
  return apiGet(`/teams/${idOrAbbr}`);
}

export async function fetchTeamRoster(idOrAbbr: string): Promise<Player[]> {
  const res = await apiGet(`/teams/${idOrAbbr}/players`);
  return extractPage<Player>(res).items;
}

export async function fetchTeamSchedule(idOrAbbr: string): Promise<SportEventRecord[]> {
  const res = await apiGet(`/teams/${idOrAbbr}/schedule`);
  return extractPage<SportEventRecord>(res).items;
}

export async function fetchTeamResults(idOrAbbr: string): Promise<SportEventRecord[]> {
  const res = await apiGet(`/teams/${idOrAbbr}/results`);
  return extractPage<SportEventRecord>(res).items;
}
