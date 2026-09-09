import { apiGet, extractPage } from './api/client';
import type { Stream } from '../types/index';

function mapStreamItem(item: Record<string, unknown>): Stream {
  return {
    id: item.id as string,
    title: item.title as string,
    shortTitle: item.title as string,
    status: item.status as string,
    matchId: (item.matchId as string) || undefined,
    embedType: undefined,
    embedId: undefined,
    embedUrl: (item.streamUrl as string) || undefined,
    image: (item.thumbnailUrl as string) || undefined,
    theme: undefined,
    language: undefined,
    quality: undefined,
    host: (item.provider as string) || undefined,
    coHost: undefined,
    viewers: undefined,
    chatSample: undefined,
    startedAt: (item.startedAt as string) || undefined,
    tags: undefined,
    description: undefined,
    ...item,
  };
}

export async function fetchStreams(
  { status, matchId }: { status?: string; matchId?: string } = {}
): Promise<Stream[]> {
  const res = await apiGet('/streams', { status, matchId });
  return extractPage<Record<string, unknown>>(res).items.map(mapStreamItem);
}

export async function fetchStreamById(id: string): Promise<Stream | null> {
  const item = await apiGet<Record<string, unknown>>(`/streams/${id}`);
  if (!item) return null;
  return mapStreamItem(item);
}
