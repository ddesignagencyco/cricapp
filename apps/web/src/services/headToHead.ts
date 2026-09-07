import { apiGet } from './api/client';
import { HeadToHeadDto } from '../types/index';

export async function fetchHeadToHead(
  teamAId: string,
  teamBId: string
): Promise<HeadToHeadDto | null> {
  // Sort IDs so order doesn't matter (if backend requires it)
  const [a, b] = [teamAId, teamBId].sort();
  return apiGet(`/head-to-head/${a}/${b}`);
}
