import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { TournamentApi, TournamentSeason, SportEventRecord } from '../types/index';

export interface TournamentsListParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  page?: number;
  limit?: number;
}

export interface TournamentPageResult {
  items: TournamentApi[];
  total: number;
  totalPages: number;
}

export async function fetchTournaments(
  params: TournamentsListParams = {},
  signal?: AbortSignal
): Promise<TournamentApi[]> {
  const res = await apiGet('/tournaments', params, { signal });
  return extractPage<TournamentApi>(res).items;
}

export async function fetchTournamentsPage(
  params: TournamentsListParams = {},
  signal?: AbortSignal
): Promise<TournamentPageResult> {
  const res = await apiGet('/tournaments', params, { signal });
  const { items, meta } = extractPage<TournamentApi>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchTournamentById(
  tournamentId: string,
  signal?: AbortSignal
): Promise<TournamentApi | null> {
  return apiGetOptional(`/tournaments/${tournamentId}`, undefined, { signal });
}

export async function fetchTournamentSeasons(
  tournamentId: string,
  signal?: AbortSignal
): Promise<TournamentSeason[]> {
  const res = await apiGet(`/tournaments/${tournamentId}/seasons`, { page: 1, limit: 100 }, { signal });
  return extractPage<TournamentSeason>(res).items;
}

export async function fetchTournamentResults(
  tournamentOrSeasonId: string,
  params: { page?: number; limit?: number } = {},
  signal?: AbortSignal
): Promise<SportEventRecord[]> {
  const res = await apiGet(
    `/tournaments/${tournamentOrSeasonId}/results`,
    {
      page: 1,
      limit: 100,
      ...params,
    },
    { signal }
  );
  return extractPage<SportEventRecord>(res).items;
}
