import { apiGet, extractPage } from './api/client';
import type { Tour } from '../types/index';

export interface ToursListParams {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
}

export interface ToursPageResult {
  items: Tour[];
  total: number;
  totalPages: number;
}

export async function fetchTours(signal?: AbortSignal): Promise<Tour[]> {
  const res = await fetchToursPage({ page: 1, limit: 20 }, signal);
  return res.items;
}

export async function fetchToursPage(
  params: ToursListParams = {},
  signal?: AbortSignal
): Promise<ToursPageResult> {
  const res = await apiGet('/tours', { page: 1, limit: 20, ...params }, { signal });
  const { items, meta } = extractPage<Tour>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}
