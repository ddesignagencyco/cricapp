import { apiGet, apiGetOptional, apiPut } from './api/client';
import { authHeaders } from './auth';

export interface EditorialPageSummary {
  slug: string;
  title: string;
  updatedAt?: string;
}

export interface EditorialPage extends EditorialPageSummary {
  content: string;
  createdAt?: string;
}

export async function fetchEditorialPages(): Promise<EditorialPageSummary[]> {
  const res = await apiGet<EditorialPageSummary[]>('/editorial-pages');
  return Array.isArray(res) ? res : [];
}

export function fetchEditorialPage(slug: string): Promise<EditorialPage | null> {
  return apiGetOptional<EditorialPage>(`/editorial-pages/${encodeURIComponent(slug)}`);
}

export function upsertEditorialPage(
  slug: string,
  input: { title: string; content: string }
): Promise<EditorialPage> {
  return apiPut<EditorialPage>(`/admin/editorial-pages/${encodeURIComponent(slug)}`, input, {
    headers: authHeaders(),
  });
}
