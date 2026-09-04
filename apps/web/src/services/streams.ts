import { streams } from '../data/streams';
import { Stream } from '../types/index';

export function fetchStreams(
  { status, matchId }: { status?: string; matchId?: string } = {}
): Stream[] {
  let list = streams;
  if (status) list = list.filter((s) => s.status === status);
  if (matchId) list = list.filter((s) => s.matchId === matchId);
  return list;
}

export function fetchStreamById(id: string): Stream | null {
  return streams.find((s) => s.id === id) || null;
}

export { streams };
