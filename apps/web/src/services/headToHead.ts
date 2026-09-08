import { apiGet } from './api/client';
import { HeadToHead } from '../types/index';

export async function fetchHeadToHead(
  teamAId: string,
  teamBId: string
): Promise<HeadToHead | null> {
  // Sort IDs so order doesn't matter (if backend requires it)
  const [a, b] = [teamAId, teamBId].sort();
  return apiGet(`/head-to-head/${a}/${b}`);
}
