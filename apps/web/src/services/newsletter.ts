import { apiGet, apiPost, extractPage } from './api/client';
import { authHeaders } from './auth';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: string;
  subscribedAt?: string;
  unsubscribedAt?: string | null;
  createdAt?: string;
}

export function subscribeNewsletter(email: string): Promise<{ message: string }> {
  return apiPost('/newsletter/subscribe', { email });
}

export function unsubscribeNewsletter(token: string): Promise<{ message: string }> {
  return apiPost('/newsletter/unsubscribe', { token });
}

export async function fetchNewsletterSubscribers(
  params: { page?: number; limit?: number; status?: string; q?: string } = {}
): Promise<{ items: NewsletterSubscriber[]; total: number; totalPages: number }> {
  const res = await apiGet('/admin/newsletter/subscribers', { page: 1, limit: 20, ...params }, {
    headers: authHeaders(),
  });
  const { items, meta } = extractPage<NewsletterSubscriber>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}
