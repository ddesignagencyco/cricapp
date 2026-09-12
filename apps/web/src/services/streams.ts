import { apiGet, apiGetOptional, apiPost, apiPatch, apiDelete, extractPage } from './api/client';
import { authHeaders } from './auth';
import type { Stream } from '../types/index';

export interface StreamInput {
  title: string;
  streamUrl: string;
  matchId?: string;
  provider?: string;
  thumbnailUrl?: string;
  status?: 'upcoming' | 'live' | 'ended' | string;
  scheduledAt?: string;
}

function mapStreamItem(item: Record<string, unknown>): Stream {
  return {
    id: item.id as string,
    title: item.title as string,
    shortTitle: (item.title as string) || '',
    status: (item.status as string) || 'upcoming',
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
    startedAt: (item.startedAt as string) || (item.scheduledAt as string) || undefined,
    tags: undefined,
    description: undefined,
    ...item,
  };
}

export async function fetchStreams(
  { status, page, limit }: { status?: string; page?: number; limit?: number } = {}
): Promise<Stream[]> {
  const res = await fetchStreamsPage({ status, page, limit });
  return res.items;
}

export async function fetchStreamsPage(
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<{ items: Stream[]; total: number; totalPages: number }> {
  const res = await apiGet('/streams', { page: 1, limit: 20, ...params });
  const { items, meta } = extractPage<Record<string, unknown>>(res);
  return { items: items.map(mapStreamItem), total: meta.total, totalPages: meta.totalPages };
}

export async function fetchStreamById(id: string): Promise<Stream | null> {
  const item = await apiGetOptional<Record<string, unknown>>(`/streams/${id}`);
  if (!item) return null;
  return mapStreamItem(item);
}

export function createStream(input: StreamInput): Promise<Stream> {
  return apiPost<Stream>('/streams', input, { headers: authHeaders() });
}

export function updateStream(id: string, input: Partial<StreamInput>): Promise<Stream> {
  return apiPatch<Stream>(`/streams/${id}`, input, { headers: authHeaders() });
}

export async function deleteStream(id: string): Promise<void> {
  await apiDelete(`/streams/${id}`, { headers: authHeaders() });
}
