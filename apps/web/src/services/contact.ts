import { apiGet, apiPatch, apiPost, extractPage } from './api/client';
import { authHeaders } from './auth';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  status: string;
  createdAt: string;
}

export function submitContact(input: {
  name: string;
  email: string;
  message: string;
}): Promise<{ message: string; submission?: { id: string; createdAt: string } }> {
  return apiPost('/contact', input);
}

export async function fetchContactSubmissions(
  params: { page?: number; limit?: number; status?: string } = {}
): Promise<{ items: ContactSubmission[]; total: number; totalPages: number }> {
  const res = await apiGet('/admin/contact-submissions', { page: 1, limit: 20, ...params }, {
    headers: authHeaders(),
  });
  const { items, meta } = extractPage<ContactSubmission>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export function updateContactStatus(
  id: string,
  status: 'new' | 'read' | 'resolved'
): Promise<ContactSubmission> {
  return apiPatch<ContactSubmission>(`/admin/contact-submissions/${id}/status`, { status }, {
    headers: authHeaders(),
  });
}
