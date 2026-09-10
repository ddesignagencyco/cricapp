import { apiGet, apiPost, apiDelete, extractPage } from './api/client';
import { authHeaders } from './auth';
import type { AuthUser } from '../types/auth';

export type CommentTarget = 'match' | 'news';
export type ReactionTarget = 'match' | 'news' | 'comment';

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

export async function listComments(
  targetType: CommentTarget,
  targetId: string,
  page = 1,
  limit = 20
): Promise<{ items: CommentItem[]; total: number; totalPages: number }> {
  const res = await apiGet('/comments', { targetType, targetId, page, limit });
  const { items, meta } = extractPage<CommentItem>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function createComment(
  targetType: CommentTarget,
  targetId: string,
  body: string
): Promise<CommentItem> {
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
  emoji: string
): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/reactions', { targetType, targetId, emoji }, { headers: authHeaders() });
}

export type { AuthUser };
