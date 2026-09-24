import { apiGetOptional } from './api/client';
import { HeadToHead } from '../types/index';
import { decodeEntityId, entityIdPath } from '../utils/entityId';

export async function fetchHeadToHead(
  teamAId: string,
  teamBId: string
): Promise<HeadToHead | null> {
  const [a, b] = [decodeEntityId(teamAId), decodeEntityId(teamBId)].sort();
  if (!a || !b) return null;
  return apiGetOptional(`/head-to-head/${entityIdPath(a)}/${entityIdPath(b)}`);
}
