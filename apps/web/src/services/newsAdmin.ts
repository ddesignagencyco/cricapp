import { apiGet, apiPost, apiPatch, apiDelete, extractPage } from './api/client';
import { authHeaders } from './auth';

export interface NewsCategory {
  id: string;
  name: string;
  slug: string;
}

export interface NewsArticleAdmin {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  imageUrl: string | null;
  author: string | null;
  source: string | null;
  categoryId: string | null;
  tags: string[] | null;
  publishedAt: string | null;
  isPublished: boolean;
  createdAt: string;
  category: NewsCategory | null;
}

export interface NewsInput {
  title: string;
  summary?: string;
  content: string;
  imageUrl?: string;
  author?: string;
  source?: string;
  categoryId?: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface NewsAdminListParams {
  [key: string]: string | number | boolean | undefined | null;
  q?: string;
  category?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export async function fetchNewsAdmin(
  params: NewsAdminListParams = {}
): Promise<{ items: NewsArticleAdmin[]; total: number; totalPages: number }> {
  const res = await apiGet('/news', params);
  const { items, meta } = extractPage<NewsArticleAdmin>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

/** The API caps `limit` at 100, so larger sets must be collected page by page. */
export async function fetchAllNewsAdmin(
  params: NewsAdminListParams = {},
  maxPages = 20
): Promise<NewsArticleAdmin[]> {
  const limit = 100;
  const all: NewsArticleAdmin[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetchNewsAdmin({ ...params, page, limit });
    all.push(...res.items);
    totalPages = res.totalPages || 1;
    page += 1;
  } while (page <= totalPages && page <= maxPages);

  return all;
}

export function fetchNewsCategories(): Promise<NewsCategory[]> {
  return apiGet<NewsCategory[]>('/news/categories');
}

export function fetchNewsArticle(idOrSlug: string): Promise<NewsArticleAdmin> {
  return apiGet<NewsArticleAdmin>(`/news/${idOrSlug}`);
}

export function createNews(input: NewsInput): Promise<NewsArticleAdmin> {
  return apiPost<NewsArticleAdmin>('/news', input, { headers: authHeaders() });
}

export function updateNews(id: string, input: Partial<NewsInput>): Promise<NewsArticleAdmin> {
  return apiPatch<NewsArticleAdmin>(`/news/${id}`, input, { headers: authHeaders() });
}

export async function deleteNews(id: string): Promise<void> {
  await apiDelete(`/news/${id}`, { headers: authHeaders() });
}

export function createCategory(name: string): Promise<NewsCategory> {
  return apiPost<NewsCategory>('/news/categories', { name }, { headers: authHeaders() });
}
