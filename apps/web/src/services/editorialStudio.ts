import { apiDelete, apiGet, apiPatch, apiPost, apiPut, extractPage } from './api/client';
import { authHeaders } from './auth';
import type { NewsArticleAdmin, NewsCategory, NewsInput } from './newsAdmin';
import type { AdminAuthor } from './admin';

export interface EditorialOverview {
  role: 'AUTHOR' | 'EDITOR';
  authorProfile: AdminAuthor | null;
  stats: {
    total: number;
    published: number;
    drafts: number;
    categories: number;
    authors: number;
  };
  recentArticles: Array<{
    id: string;
    title: string;
    slug: string;
    language: string;
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    imageUrl: string | null;
    category: { id: string; name: string; slug: string } | null;
    authorName: string | null;
  }>;
}

export interface EditorialPageItem {
  id: string;
  slug: string;
  title: string;
  content: string;
  updatedAt: string;
}

export function fetchEditorialOverview(): Promise<EditorialOverview> {
  return apiGet<EditorialOverview>('/editorial/overview', undefined, { headers: authHeaders() });
}

export function fetchMyAuthorProfile(): Promise<AdminAuthor | null> {
  return apiGet<AdminAuthor | null>('/editorial/profile', undefined, { headers: authHeaders() });
}

export function upsertMyAuthorProfile(input: {
  name: string;
  slug?: string;
  bio?: string;
  avatarUrl?: string;
}): Promise<AdminAuthor> {
  return apiPut<AdminAuthor>('/editorial/profile', input, { headers: authHeaders() });
}

export async function fetchEditorialArticles(
  params: {
    page?: number;
    limit?: number;
    q?: string;
    status?: 'published' | 'draft';
    category?: string;
    authorId?: string;
    language?: string;
  } = {},
): Promise<{ items: NewsArticleAdmin[]; total: number; totalPages: number }> {
  const res = await apiGet(
    '/editorial/articles',
    { page: 1, limit: 20, ...params },
    { headers: authHeaders() },
  );
  const { items, meta } = extractPage<NewsArticleAdmin>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export function fetchEditorialArticle(id: string): Promise<NewsArticleAdmin> {
  return apiGet<NewsArticleAdmin>(`/editorial/articles/${id}`, undefined, { headers: authHeaders() });
}

export function createEditorialArticle(input: NewsInput): Promise<NewsArticleAdmin> {
  return apiPost<NewsArticleAdmin>('/editorial/articles', input, { headers: authHeaders() });
}

export function updateEditorialArticle(
  id: string,
  input: Partial<NewsInput>,
): Promise<NewsArticleAdmin> {
  return apiPatch<NewsArticleAdmin>(`/editorial/articles/${id}`, input, { headers: authHeaders() });
}

export function deleteEditorialArticle(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/editorial/articles/${id}`, { headers: authHeaders() });
}

export function createEditorialTranslation(
  sourceId: string,
  input: NewsInput,
): Promise<NewsArticleAdmin> {
  return apiPost<NewsArticleAdmin>(`/editorial/articles/${sourceId}/translations`, input, {
    headers: authHeaders(),
  });
}

export function bulkEditorialArticles(input: {
  ids: string[];
  action?: 'update' | 'delete';
  status?: 'published' | 'draft';
  categoryId?: string;
  authorId?: string;
}): Promise<{ affected: number }> {
  return apiPost<{ affected: number }>('/editorial/articles/bulk', input, { headers: authHeaders() });
}

export function fetchEditorialCategories(): Promise<NewsCategory[]> {
  return apiGet<NewsCategory[]>('/editorial/categories', undefined, { headers: authHeaders() });
}

export function createEditorialCategory(input: { name: string; slug?: string }): Promise<NewsCategory> {
  return apiPost<NewsCategory>('/editorial/categories', input, { headers: authHeaders() });
}

export function updateEditorialCategory(
  idOrSlug: string,
  input: { name?: string; slug?: string },
): Promise<NewsCategory> {
  return apiPatch<NewsCategory>(`/editorial/categories/${idOrSlug}`, input, { headers: authHeaders() });
}

export function deleteEditorialCategory(idOrSlug: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/editorial/categories/${idOrSlug}`, { headers: authHeaders() });
}

export function fetchEditorialAuthors(): Promise<AdminAuthor[]> {
  return apiGet<AdminAuthor[]>('/editorial/authors', undefined, { headers: authHeaders() });
}

export function fetchEditorialPagesList(): Promise<EditorialPageItem[]> {
  return apiGet<EditorialPageItem[]>('/editorial/pages', undefined, { headers: authHeaders() });
}

export function upsertEditorialPageItem(
  slug: string,
  input: { title: string; content: string },
): Promise<EditorialPageItem> {
  return apiPut<EditorialPageItem>(`/editorial/pages/${slug}`, input, { headers: authHeaders() });
}
