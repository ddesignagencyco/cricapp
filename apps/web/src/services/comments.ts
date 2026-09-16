import { apiGet, apiPost, apiDelete, extractPage } from './api/client';
import { authHeaders } from './auth';
import type { AuthUser } from '../types/auth';

export type CommentTarget = 'match' | 'news' | 'stream';
export type ReactionTarget = 'match' | 'news' | 'stream' | 'comment';

export interface CommentItem {
  id: string;
  userId: string;
  targetType: string;
  targetId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; displayName: string | null } | null;
}

export interface ReactionCounts {
  counts: Record<string, number>;
  emojis: string[];
}

export async function listStreamComments(
  streamId: string,
  page = 1,
  limit = 10
): Promise<{ items: CommentItem[]; total: number; totalPages: number }> {
  const res = await apiGet(`/streams/${streamId}/comments`, { page, limit });
  const { items, meta } = extractPage<CommentItem>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function createStreamComment(streamId: string, body: string): Promise<CommentItem> {
  return apiPost<CommentItem>(`/streams/${streamId}/comments`, { body }, { headers: authHeaders() });
}

export async function listComments(
  targetType: CommentTarget,
  targetId: string,
  page = 1,
  limit = 10
): Promise<{ items: CommentItem[]; total: number; totalPages: number }> {
  if (targetType === 'stream') return listStreamComments(targetId, page, limit);
  const res = await apiGet('/comments', { targetType, targetId, page, limit });
  const { items, meta } = extractPage<CommentItem>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function createComment(
  targetType: CommentTarget,
  targetId: string,
  body: string
): Promise<CommentItem> {
  if (targetType === 'stream') return createStreamComment(targetId, body);
  return apiPost<CommentItem>('/comments', { targetType, targetId, body }, { headers: authHeaders() });
}

export async function deleteComment(id: string): Promise<void> {
  await apiDelete(`/comments/${id}`, { headers: authHeaders() });
}

export function getReactionCounts(targetType: ReactionTarget, targetId: string): Promise<ReactionCounts> {
  return apiGet<ReactionCounts>('/reactions', { targetType, targetId });
}

export function toggleReaction(
  targetType: ReactionTarget,
  targetId: string,
  emoji: string,
  commentId?: string
): Promise<{ message: string }> {
  return apiPost<{ message: string }>(
    '/reactions',
    { targetType, targetId, emoji, commentId },
    { headers: authHeaders() }
  );
}

export function reportComment(id: string, reason: string): Promise<{ message?: string }> {
  return apiPost(`/comments/${id}/report`, { reason }, { headers: authHeaders() });
}

export type { AuthUser };
