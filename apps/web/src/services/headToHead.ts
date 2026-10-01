import { apiGetOptional } from './api/client';
import { HeadToHead } from '../types/index';
import { decodeEntityId, entityIdPath } from '../utils/entityId';

export async function fetchHeadToHead(
  teamAId: string,
  teamBId: string,
  signal?: AbortSignal
): Promise<HeadToHead | null> {
  const [a, b] = [decodeEntityId(teamAId), decodeEntityId(teamBId)].sort();
  if (!a || !b) return null;
  const path = `/head-to-head/${entityIdPath(a)}/${entityIdPath(b)}`;
  // The options argument is only passed when there is a signal, so a caller without
  // one produces the same call it always did rather than a second `undefined`.
  return signal
    ? apiGetOptional(path, undefined, { signal })
    : apiGetOptional(path);
}
