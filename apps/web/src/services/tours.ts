import { apiGet } from './api/client';
import { Tour } from '../types/index';
import { demoTours } from '../data/demo';

export async function fetchTours(): Promise<Tour[] | null> {
  const data = await apiGet('/tours');
  if (Array.isArray(data) && data.length > 0) return data;
  return demoTours as Tour[];
}