import { tournaments } from '../data/tournaments';
import { Tournament } from '../types/index';

export function fetchTournaments(
  { id }: { id?: string } = {}
): Tournament[] | Tournament | null {
  if (id) return tournaments.find((t) => t.id === id) || null;
  return tournaments;
}

export { tournaments };
