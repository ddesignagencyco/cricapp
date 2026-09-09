import { apiGet, extractPage } from './api/client';
import type { Player } from '../types/index';

export async function fetchPlayers(
  { q, team }: { q?: string; team?: string } = {}
): Promise<Player[]> {
  const res = await apiGet('/players', { q, team });
  return extractPage<Player>(res).items;
}

export async function fetchPlayersByTeam(teamAbbr: string): Promise<Player[]> {
  const res = await apiGet('/players', { team: teamAbbr });
  return extractPage<Player>(res).items;
}

export async function fetchPlayerById(playerId: string): Promise<Player | null> {
  return apiGet(`/players/${playerId}`, { recent: true });
}
