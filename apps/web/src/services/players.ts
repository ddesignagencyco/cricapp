import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { Player } from '../types/index';

export interface PlayersListParams {
  [key: string]: string | number | boolean | undefined;
  q?: string;
  team?: string;
  page?: number;
  limit?: number;
}

export interface PlayersPageResult {
  items: Player[];
  total: number;
  totalPages: number;
}

export async function fetchPlayers(
  { q, team, limit = 50 }: PlayersListParams = {},
  signal?: AbortSignal
): Promise<Player[]> {
  const res = await apiGet('/players', { q, team, limit }, { signal });
  return extractPage<Player>(res).items;
}

export async function fetchPlayersPage(
  params: PlayersListParams = {},
  signal?: AbortSignal
): Promise<PlayersPageResult> {
  const res = await apiGet('/players', params, { signal });
  const { items, meta } = extractPage<Player>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchPlayersByTeam(teamAbbr: string, signal?: AbortSignal): Promise<Player[]> {
  const res = await apiGet('/players', { team: teamAbbr }, { signal });
  return extractPage<Player>(res).items;
}

export async function fetchPlayerById(playerId: string, signal?: AbortSignal): Promise<Player | null> {
  return apiGetOptional(`/players/${playerId}`, { recent: 10 }, { signal });
}
