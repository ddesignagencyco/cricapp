import { apiGet, apiPost, apiDelete, extractPage, type PageMeta } from './api/client';
import { authHeaders } from './auth';

export type FavoriteTarget = 'team' | 'player' | 'match' | 'news' | 'tour' | 'tournament';

export interface FavoriteItem {
  id: string;
  userId: string;
  targetType: FavoriteTarget;
  targetId: string;
  createdAt: string;
  target?: unknown;
}

export async function listFavorites(
  targetType?: FavoriteTarget,
  params: { page?: number; limit?: number; expand?: boolean } = {}
): Promise<FavoriteItem[]> {
  const res = await apiGet(
    '/favorites',
    { targetType, page: params.page ?? 1, limit: params.limit ?? 100, expand: params.expand ?? true },
    { headers: authHeaders() }
  );
  return extractPage<FavoriteItem>(res).items;
}

const heartCache = new Map<FavoriteTarget, FavoriteItem[]>();
const heartInflight = new Map<FavoriteTarget, Promise<FavoriteItem[]>>();
const heartListeners = new Set<() => void>();

function notifyHeartCache() {
  heartListeners.forEach((listener) => listener());
}

export function subscribeFavoriteCache(listener: () => void): () => void {
  heartListeners.add(listener);
  return () => {
    heartListeners.delete(listener);
  };
}

export function peekFavoriteCache(targetType: FavoriteTarget): FavoriteItem[] | undefined {
  return heartCache.get(targetType);
}

/** One shared list per type for heart buttons — no expand, deduped in flight. */
export function loadFavoritesForHearts(targetType: FavoriteTarget): Promise<FavoriteItem[]> {
  const cached = heartCache.get(targetType);
  if (cached) return Promise.resolve(cached);

  const pending = heartInflight.get(targetType);
  if (pending) return pending;

  const request = listFavorites(targetType, { expand: false, limit: 100 })
    .then((items) => {
      const existing = heartCache.get(targetType);
      if (!existing?.length) {
        heartCache.set(targetType, items);
        return items;
      }
      const byTarget = new Map(items.map((item) => [item.targetId, item]));
      for (const row of existing) {
        if (!byTarget.has(row.targetId)) byTarget.set(row.targetId, row);
      }
      const merged = [...byTarget.values()];
      heartCache.set(targetType, merged);
      return merged;
    })
    .finally(() => {
      heartInflight.delete(targetType);
    });

  heartInflight.set(targetType, request);
  return request;
}

export function rememberFavoriteAdded(item: FavoriteItem) {
  const current = heartCache.get(item.targetType) ?? [];
  if (current.some((row) => row.id === item.id || row.targetId === item.targetId)) {
    heartCache.set(
      item.targetType,
      current.map((row) => (row.targetId === item.targetId ? item : row)),
    );
  } else {
    heartCache.set(item.targetType, [...current, item]);
  }
  notifyHeartCache();
}

export function rememberFavoriteRemoved(targetType: FavoriteTarget, favoriteId: string) {
  const current = heartCache.get(targetType);
  if (!current) return;
  heartCache.set(
    targetType,
    current.filter((row) => row.id !== favoriteId),
  );
  notifyHeartCache();
}

export function clearFavoriteCache() {
  heartCache.clear();
  heartInflight.clear();
  notifyHeartCache();
}

export async function listFavoritesPage(
  params: { targetType?: FavoriteTarget; page?: number; limit?: number; expand?: boolean } = {}
): Promise<{ items: FavoriteItem[]; total: number; totalPages: number }> {
  const res = await apiGet(
    '/favorites',
    {
      targetType: params.targetType,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      expand: params.expand ?? true,
    },
    { headers: authHeaders() }
  );
  const { items, meta } = extractPage<FavoriteItem>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function addFavorite(targetType: FavoriteTarget, targetId: string): Promise<FavoriteItem> {
  return apiPost<FavoriteItem>('/favorites', { targetType, targetId }, { headers: authHeaders() });
}

export async function removeFavorite(id: string): Promise<void> {
  await apiDelete(`/favorites/${id}`, { headers: authHeaders() });
}

export type { PageMeta };
