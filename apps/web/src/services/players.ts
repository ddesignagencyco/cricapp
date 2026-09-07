import { apiGet } from './api/client';
import { Player } from '../types/index';
import { getDemoPlayerProfile } from '../data/demo';

export function fetchPlayers(
  { q, team }: { q?: string; team?: string } = {}
): Promise<Player[] | null> {
  return apiGet('/players', { q, team });
}

export function fetchPlayersByTeam(teamAbbr: string): Promise<Player[] | null> {
  return apiGet('/players', { team: teamAbbr });
}

export async function fetchPlayerById(playerId: string): Promise<Player | null> {
  const data = await apiGet(`/players/${playerId}`, { recent: true });
  if (data) return data;
  const demo = getDemoPlayerProfile(playerId);
  return demo ? (demo as unknown as Player) : null;
}