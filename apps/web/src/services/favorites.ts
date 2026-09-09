import { apiGet, apiPost, apiDelete, extractPage, type PageMeta } from './api/client';
import { authHeaders } from './auth';

export type FavoriteTarget = 'team' | 'player' | 'match';

export interface FavoriteItem {
  id: string;
  userId: string;
  targetType: FavoriteTarget;
  targetId: string;
  createdAt: string;
}

export async function listFavorites(targetType?: FavoriteTarget): Promise<FavoriteItem[]> {
  const res = await apiGet('/favorites', { targetType }, { headers: authHeaders() });
  return extractPage<FavoriteItem>(res).items;
}

export async function addFavorite(targetType: FavoriteTarget, targetId: string): Promise<FavoriteItem> {
  return apiPost<FavoriteItem>('/favorites', { targetType, targetId }, { headers: authHeaders() });
}

export async function removeFavorite(id: string): Promise<void> {
  await apiDelete(`/favorites/${id}`, { headers: authHeaders() });
}

export type { PageMeta };
