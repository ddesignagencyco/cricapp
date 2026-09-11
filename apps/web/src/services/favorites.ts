import { apiGet, apiPost, apiDelete, extractPage, type PageMeta } from './api/client';
import { authHeaders } from './auth';

export type FavoriteTarget = 'team' | 'player' | 'match';

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
