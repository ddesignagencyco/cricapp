import { apiGet, apiGetOptional, extractPage } from './api/client';
import type { Player } from '../types/index';

export async function fetchPlayers(
  { q, team, limit = 50 }: { q?: string; team?: string; limit?: number } = {}
): Promise<Player[]> {
  const res = await apiGet('/players', { q, team, limit });
  return extractPage<Player>(res).items;
}

export async function fetchPlayersPage(
  params: { q?: string; team?: string; page?: number; limit?: number } = {}
): Promise<{ items: Player[]; total: number; totalPages: number }> {
  const res = await apiGet('/players', params);
  const { items, meta } = extractPage<Player>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchPlayersByTeam(teamAbbr: string): Promise<Player[]> {
  const res = await apiGet('/players', { team: teamAbbr });
  return extractPage<Player>(res).items;
}

export async function fetchPlayerById(playerId: string): Promise<Player | null> {
  return apiGetOptional(`/players/${playerId}`, { recent: true });
}
