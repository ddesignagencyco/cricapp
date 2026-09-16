import { apiGetOptional } from './api/client';
import { HeadToHead } from '../types/index';

export async function fetchHeadToHead(
  teamAId: string,
  teamBId: string
): Promise<HeadToHead | null> {
  const [a, b] = [teamAId, teamBId].sort();
  return apiGetOptional(`/head-to-head/${a}/${b}`);
}
