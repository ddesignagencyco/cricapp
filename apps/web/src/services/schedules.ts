import { apiGet, extractPage } from './api/client';
import type { SportEventRecord } from '../types/index';
import type { PageMeta } from './api/client';

const PAGE_SIZE = 20;

export async function fetchDailySchedule(
  date: string,
  page = 1,
  limit = PAGE_SIZE
): Promise<{ items: SportEventRecord[]; meta: PageMeta }> {
  const res = await apiGet(`/schedules/${date}`, { page, limit });
  return extractPage<SportEventRecord>(res);
}

export async function fetchDailyResults(
  date: string,
  page = 1,
  limit = PAGE_SIZE
): Promise<{ items: SportEventRecord[]; meta: PageMeta }> {
  const res = await apiGet(`/schedules/${date}/results`, { page, limit });
  return extractPage<SportEventRecord>(res);
}
