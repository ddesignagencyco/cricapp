import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { TournamentApi, TournamentSeason, SportEventRecord } from '../types/index';

export async function fetchTournaments(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<TournamentApi[]> {
  const res = await apiGet('/tournaments', params);
  return extractPage<TournamentApi>(res).items;
}

export async function fetchTournamentsPage(
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<{ items: TournamentApi[]; total: number; totalPages: number }> {
  const res = await apiGet('/tournaments', params);
  const { items, meta } = extractPage<TournamentApi>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchTournamentById(tournamentId: string): Promise<TournamentApi | null> {
  return apiGetOptional(`/tournaments/${tournamentId}`);
}

export async function fetchTournamentSeasons(tournamentId: string): Promise<TournamentSeason[]> {
  const res = await apiGet(`/tournaments/${tournamentId}/seasons`);
  return extractPage<TournamentSeason>(res).items;
}

export async function fetchTournamentResults(tournamentOrSeasonId: string): Promise<SportEventRecord[]> {
  const res = await apiGet(`/tournaments/${tournamentOrSeasonId}/results`);
  return extractPage<SportEventRecord>(res).items;
}
