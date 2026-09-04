import { apiGet } from './api/client';
import { Player } from '../types/index';

export function fetchPlayers(
  { q, team }: { q?: string; team?: string } = {}
): Promise<Player[] | null> {
  return apiGet('/players', { q, team });
}

export function fetchPlayersByTeam(teamAbbr: string): Promise<Player[] | null> {
  return apiGet('/players', { team: teamAbbr });
}

export function fetchPlayerById(playerId: string): Promise<Player | null> {
  return apiGet(`/players/${playerId}`);
}
