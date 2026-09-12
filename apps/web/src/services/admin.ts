import { apiDelete, apiGet, apiPatch, apiPost, extractPage } from './api/client';
import { authHeaders } from './auth';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminAuthor {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
}

export interface AdminAnalytics {
  users: number;
  matches: number;
  teams: number;
  players: number;
  tournaments: number;
  tours: number;
  comments: number;
  favorites: {
    total: number;
    types: {
      team: number;
      player: number;
      match: number;
      [key: string]: number;
    };
  };
  streams: number;
  pendingReports: number;
  publishedArticles: number;
  totalShares: number;
}

export interface IngestionHealth {
  status: 'healthy' | 'stale' | 'unknown' | string;
  heartbeat: { ts?: number; liveCount?: number } | null;
  heartbeatAgeMs: number | null;
  liveMatchCount: number;
  liveMatchIds: string[];
  syncKeyCount: number;
  newsLastSynced: number | null;
  checkedAt: string;
}

export interface ReportedComment {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  comment: {
    id: string;
    body: string;
    status: string;
    userId: string;
    targetType: string;
    targetId: string;
    createdAt: string;
    user: { id: string; username: string; email: string } | null;
  } | null;
}

export async function fetchAdminUsers(
  params: { page?: number; limit?: number; q?: string } = {}
): Promise<{ items: AdminUser[]; total: number; totalPages: number }> {
  const res = await apiGet('/admin/users', { page: 1, limit: 20, ...params }, { headers: authHeaders() });
  const { items, meta } = extractPage<AdminUser>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export function updateAdminUser(
  id: string,
  input: { isAdmin?: boolean; emailVerified?: boolean }
): Promise<AdminUser> {
  return apiPatch<AdminUser>(`/admin/users/${id}`, input, { headers: authHeaders() });
}

export async function deleteAdminUser(id: string): Promise<void> {
  await apiDelete(`/admin/users/${id}`, { headers: authHeaders() });
}

export async function fetchAdminAuthors(): Promise<AdminAuthor[]> {
  const res = await apiGet<AdminAuthor[]>('/admin/authors', undefined, { headers: authHeaders() });
  return Array.isArray(res) ? res : [];
}

export function createAdminAuthor(input: { name: string; bio?: string; avatarUrl?: string }): Promise<AdminAuthor> {
  return apiPost<AdminAuthor>('/admin/authors', input, { headers: authHeaders() });
}

export function updateAdminAuthor(
  id: string,
  input: { name?: string; bio?: string; avatarUrl?: string }
): Promise<AdminAuthor> {
  return apiPatch<AdminAuthor>(`/admin/authors/${id}`, input, { headers: authHeaders() });
}

export async function fetchReportedComments(): Promise<ReportedComment[]> {
  const res = await apiGet<ReportedComment[]>('/admin/reported-comments', undefined, { headers: authHeaders() });
  return Array.isArray(res) ? res : [];
}

export function moderateComment(id: string, status: 'approved' | 'hidden' | 'deleted'): Promise<unknown> {
  return apiPatch(`/admin/comments/${id}`, { status }, { headers: authHeaders() });
}

export function resolveReport(id: string, status: 'pending' | 'resolved' | 'dismissed' = 'resolved'): Promise<unknown> {
  return apiPatch(`/admin/reports/${id}`, { status }, { headers: authHeaders() });
}

export function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  return apiGet<AdminAnalytics>('/admin/analytics', undefined, { headers: authHeaders() });
}

export function fetchIngestionHealth(): Promise<IngestionHealth> {
  return apiGet<IngestionHealth>('/admin/ingestion-health', undefined, { headers: authHeaders() });
}
