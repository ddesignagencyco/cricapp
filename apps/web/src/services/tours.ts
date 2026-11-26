import { apiGet, extractPage } from './api/client';
import type { Tour } from '../types/index';

export interface ToursListParams {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
  /** Name or country-code search (GET /tours?q=). */
  q?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ToursPageResult {
  items: Tour[];
  total: number;
  totalPages: number;
  facets?: {
    categories: Array<{ key: string; count: number }>;
  };
}

export async function fetchTours(signal?: AbortSignal): Promise<Tour[]> {
  const res = await fetchToursPage({ page: 1, limit: 20 }, signal);
  return res.items;
}

export async function fetchToursPage(
  params: ToursListParams = {},
  signal?: AbortSignal
): Promise<ToursPageResult> {
  const res = await apiGet<Record<string, unknown>>('/tours', { page: 1, limit: 20, ...params }, { signal });
  const { items, meta } = extractPage<Tour>(res);
  const facets =
    res && typeof res === 'object' && 'facets' in res
      ? (res.facets as ToursPageResult['facets'])
      : undefined;
  return { items, total: meta.total, totalPages: meta.totalPages, facets };
}
