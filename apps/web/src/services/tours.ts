import { apiGet, extractPage } from './api/client';
import type { Tour } from '../types/index';

export async function fetchTours(): Promise<Tour[]> {
  const res = await apiGet('/tours');
  return extractPage<Tour>(res).items;
}
