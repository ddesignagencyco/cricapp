import { apiGet } from './api/client';

export interface ApiHealthJson {
  status?: string;
  [key: string]: unknown;
}

export function fetchApiHealth(): Promise<ApiHealthJson> {
  return apiGet<ApiHealthJson>('/health/json');
}
