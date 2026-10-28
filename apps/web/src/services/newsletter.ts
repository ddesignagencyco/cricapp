import { apiGet, apiPost, apiPut, extractPage } from './api/client';
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

/* ─── Subscriber self-service (token from the email link) ─── */

export type NewsletterType =
  | 'daily_digest'
  | 'weekly_roundup'
  | 'match_preview'
  | 'psl_update'
  | 'breaking_news'
  | 'reengagement';

export interface NewsletterPreference {
  type: NewsletterType;
  label: string;
  description: string;
  enabled: boolean;
}

export interface NewsletterSubscription {
  /** Masked, e.g. "fa•••@example.com". */
  email: string;
  status: 'active' | 'unsubscribed' | string;
  preferences: NewsletterPreference[];
}

export function fetchNewsletterSubscription(token: string): Promise<NewsletterSubscription> {
  return apiGet(`/newsletter/subscription/${encodeURIComponent(token)}`);
}

export function updateNewsletterPreferences(
  token: string,
  preferences: Partial<Record<NewsletterType, boolean>>,
): Promise<NewsletterSubscription> {
  return apiPut('/newsletter/preferences', { token, preferences });
}

export function resubscribeNewsletter(token: string): Promise<{ message: string }> {
  return apiPost('/newsletter/resubscribe', { token });
}

/* ─── Admin campaigns ─── */

export interface NewsletterCampaignInput {
  type: NewsletterType;
  matchId?: string;
  newsId?: string;
}

export interface NewsletterCampaignOverview {
  autoSend: boolean;
  subscribers: { active: number; unsubscribed: number };
  types: Array<{ type: NewsletterType; label: string; description: string; automatic: boolean }>;
  recentCampaigns: Array<{
    type: NewsletterType;
    issueKey: string;
    subject: string | null;
    lastSentAt: string | null;
    sent: number;
    failed: number;
  }>;
}

export interface NewsletterPreview {
  subject: string;
  preheader: string;
  html: string;
  text: string;
  issueKey: string;
}

export function fetchNewsletterCampaigns(): Promise<NewsletterCampaignOverview> {
  return apiGet('/admin/newsletter/campaigns');
}

export function previewNewsletterCampaign(input: NewsletterCampaignInput): Promise<NewsletterPreview> {
  return apiPost('/admin/newsletter/campaigns/preview', input);
}

export function sendNewsletterTest(
  input: NewsletterCampaignInput & { to?: string },
): Promise<{ to: string; subject: string; issueKey: string }> {
  return apiPost('/admin/newsletter/campaigns/test', input);
}

/** Starts the send; it continues on the server and shows up in fetchNewsletterCampaigns. */
export function sendNewsletterCampaign(
  input: NewsletterCampaignInput,
): Promise<{ started: boolean; type: NewsletterType; issueKey: string; subject: string }> {
  return apiPost('/admin/newsletter/campaigns/send', input);
}
