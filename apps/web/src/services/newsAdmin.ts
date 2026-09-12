import { apiGet, apiPost, apiPatch, apiDelete, extractPage, ApiError } from './api/client';
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
  authorId?: string | null;
  source: string | null;
  categoryId: string | null;
  tags: string[] | null;
  language?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  publishedAt: string | null;
  isPublished: boolean;
  createdAt: string;
  category: NewsCategory | null;
  authorRef?: { id: string; name: string; slug?: string } | null;
  playerIds?: string[];
  teamIds?: string[];
  matchIds?: string[];
  seriesIds?: string[];
}

export interface NewsInput {
  title: string;
  slug?: string;
  summary?: string;
  content: string;
  imageUrl?: string;
  author?: string;
  authorId?: string;
  source?: string;
  categoryId?: string;
  language?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  isPublished?: boolean;
}

export interface NewsAdminListParams {
  [key: string]: string | number | boolean | undefined | null;
  q?: string;
  category?: string;
  tag?: string;
  page?: number;
  limit?: number;
  playerId?: string;
  teamId?: string;
  matchId?: string;
  seriesId?: string;
}

export async function fetchNewsAdmin(
  params: NewsAdminListParams = {}
): Promise<{ items: NewsArticleAdmin[]; total: number; totalPages: number }> {
  const res = await apiGet('/admin/news', params, { headers: authHeaders() });
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

export async function fetchNewsArticle(idOrSlug: string): Promise<NewsArticleAdmin> {
  try {
    return await apiGet<NewsArticleAdmin>(`/news/${idOrSlug}`);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
    let page = 1;
    while (page <= 10) {
      const res = await fetchNewsAdmin({ page, limit: 100 });
      const found = res.items.find((article) => article.id === idOrSlug || article.slug === idOrSlug);
      if (found) return found;
      if (page >= res.totalPages) break;
      page += 1;
    }
    throw error;
  }
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

export function updateCategory(
  idOrSlug: string,
  input: { name?: string; slug?: string }
): Promise<NewsCategory> {
  return apiPatch<NewsCategory>(`/news/categories/${idOrSlug}`, input, { headers: authHeaders() });
}

export async function deleteCategory(idOrSlug: string): Promise<void> {
  await apiDelete(`/news/categories/${idOrSlug}`, { headers: authHeaders() });
}
