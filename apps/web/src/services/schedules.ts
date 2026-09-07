import { apiGet } from './api/client';
import { SportEventRecord } from '../types/index';

export function fetchDailySchedule(date: string): Promise<SportEventRecord[]> {
  return apiGet(`/schedules/${date}`);
}

export function fetchDailyResults(date: string): Promise<SportEventRecord[]> {
  return apiGet(`/schedules/${date}/results`);
}
