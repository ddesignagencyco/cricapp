import { apiDelete, apiGet, apiPatch, apiPost } from './api/client';
import { authHeaders } from './auth';

export type RssRewriteMode = 'ai_rewrite' | 'summary_attribution' | 'raw';

export interface RssFeedSourceAdmin {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  categoryId: string | null;
  authorId: string | null;
  includeKeywords: string[];
  excludeKeywords: string[];
  rewriteMode: RssRewriteMode;
  autoPublish: boolean;
  language: string;
  pollIntervalMinutes: number;
  maxItemsPerPoll: number;
  lastSyncedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  articlesImported: number;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; slug: string } | null;
  authorRef?: { id: string; name: string; slug: string } | null;
}

export interface RssFeedPayload {
  name: string;
  url: string;
  enabled?: boolean;
  categoryId?: string | null;
  authorId?: string | null;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  rewriteMode?: RssRewriteMode;
  autoPublish?: boolean;
  language?: 'en' | 'ur';
  pollIntervalMinutes?: number;
  maxItemsPerPoll?: number;
}

export interface RssPreviewItem {
  title: string;
  link: string;
  pubDate: string | null;
  imageUrl: string | null;
  summary: string;
  categories: string[];
  matched: boolean;
  matchedKeywords: string[];
  excludedBy: string | null;
}

export interface RssPreviewResponse {
  totalInFeed: number;
  previewed: number;
  matchedCount: number;
  skippedCount: number;
  items: RssPreviewItem[];
}

export interface RssSyncResponse {
  feedId: string;
  name: string;
  fetched: number;
  inserted: number;
  skippedFilter: number;
  skippedDuplicate: number;
  autoPublished: boolean;
}

export async function fetchRssFeeds(): Promise<RssFeedSourceAdmin[]> {
  const res = await apiGet<{ data: RssFeedSourceAdmin[] }>('/admin/rss-feeds', undefined, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  return Array.isArray(res?.data) ? res.data : [];
}

export async function createRssFeed(payload: RssFeedPayload): Promise<RssFeedSourceAdmin> {
  return apiPost<RssFeedSourceAdmin>('/admin/rss-feeds', payload, { headers: authHeaders() });
}

export async function updateRssFeed(
  id: string,
  payload: Partial<RssFeedPayload>,
): Promise<RssFeedSourceAdmin> {
  return apiPatch<RssFeedSourceAdmin>(`/admin/rss-feeds/${encodeURIComponent(id)}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteRssFeed(id: string): Promise<void> {
  await apiDelete(`/admin/rss-feeds/${encodeURIComponent(id)}`, { headers: authHeaders() });
}

export async function previewRssFeed(payload: {
  url: string;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  limit?: number;
}): Promise<RssPreviewResponse> {
  return apiPost<RssPreviewResponse>('/admin/rss-feeds/preview', payload, {
    headers: authHeaders(),
  });
}

export async function syncRssFeed(id: string): Promise<RssSyncResponse> {
  return apiPost<RssSyncResponse>(`/admin/rss-feeds/${encodeURIComponent(id)}/sync`, {}, {
    headers: authHeaders(),
  });
}
