import { apiGet } from './api/client';
import { SportEventRecord } from '../types/index';
import { demoDailyResults } from '../data/demo';

async function asArray(promise: Promise<any>, demo: any[]): Promise<any[]> {
  const data = await promise;
  if (Array.isArray(data) && data.length > 0) return data;
  if (data && Array.isArray(data.value) && data.value.length > 0) return data.value;
  return demo;
}

export function fetchDailySchedule(date: string): Promise<SportEventRecord[] | null> {
  return apiGet(`/schedules/${date}`);
}

export function fetchDailyResults(date: string): Promise<SportEventRecord[]> {
  return asArray(apiGet(`/schedules/${date}/results`), demoDailyResults);
}