import { apiGet, extractPage } from './api/client';
import type { Tour } from '../types/index';

export async function fetchTours(): Promise<Tour[]> {
  const res = await fetchToursPage({ page: 1, limit: 20 });
  return res.items;
}

export async function fetchToursPage(
  params: { page?: number; limit?: number } = {}
): Promise<{ items: Tour[]; total: number; totalPages: number }> {
  const res = await apiGet('/tours', { page: 1, limit: 20, ...params });
  const { items, meta } = extractPage<Tour>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}
