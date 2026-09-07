import { apiGet } from './api/client';
import { Tour } from '../types/index';

export function fetchTours(): Promise<Tour[]> {
  return apiGet('/tours');
}
