import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { Player } from '../types/index';

export interface PlayersListParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  team?: string;
  role?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export interface PlayersPageResult {
  items: Player[];
  total: number;
  totalPages: number;
  facets?: {
    roles: Array<{ key: string; count: number }>;
  };
}

export async function fetchPlayers(
  { q, team, role, limit = 50 }: PlayersListParams = {},
  signal?: AbortSignal
): Promise<Player[]> {
  const res = await apiGet('/players', { q, team, role, limit }, { signal });
  return extractPage<Player>(res).items;
}

export async function fetchPlayersPage(
  params: PlayersListParams = {},
  signal?: AbortSignal
): Promise<PlayersPageResult> {
  const res = await apiGet<Record<string, unknown>>('/players', params, { signal });
  const { items, meta } = extractPage<Player>(res);
  const facets =
    res && typeof res === 'object' && 'facets' in res
      ? (res.facets as PlayersPageResult['facets'])
      : undefined;
  return { items, total: meta.total, totalPages: meta.totalPages, facets };
}

export async function fetchPlayersByTeam(teamAbbr: string, signal?: AbortSignal): Promise<Player[]> {
  const res = await apiGet('/players', { team: teamAbbr }, { signal });
  return extractPage<Player>(res).items;
}

export async function fetchPlayerById(playerId: string, signal?: AbortSignal): Promise<Player | null> {
  return apiGetOptional(`/players/${playerId}`, { recent: 10 }, { signal });
}
