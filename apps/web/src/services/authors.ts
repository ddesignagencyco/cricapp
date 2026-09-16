import { apiGet, apiGetOptional, extractPage } from './api/client';
import { mapNewsItem } from './news';
import type { NewsArticle } from '../types/index';

export interface PublicAuthor {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  articleCount?: number;
}

function asAuthor(raw: Record<string, unknown> | PublicAuthor): PublicAuthor {
  return {
    id: String(raw.id || ''),
    name: String(raw.name || 'Author'),
    slug: String(raw.slug || ''),
    bio: (raw.bio as string | null) ?? null,
    avatarUrl: (raw.avatarUrl as string | null) ?? null,
    articleCount: typeof raw.articleCount === 'number' ? raw.articleCount : undefined,
  };
}

export async function fetchPublicAuthors(): Promise<PublicAuthor[]> {
  const res = await apiGet<unknown>('/authors');
  const rows = Array.isArray(res) ? res : extractPage<Record<string, unknown>>(res).items;
  return rows.map((row) => asAuthor(row as Record<string, unknown>));
}

export async function fetchPublicAuthor(
  idOrSlug: string,
  params: { page?: number; limit?: number } = {}
): Promise<{ author: PublicAuthor; articles: NewsArticle[]; total: number; totalPages: number } | null> {
  const res = await apiGetOptional<{
    author?: Record<string, unknown>;
    articles?: unknown;
  }>(`/authors/${encodeURIComponent(idOrSlug)}`, { page: 1, limit: 24, ...params });
  if (!res?.author) return null;
  const page = extractPage<Record<string, unknown>>(res.articles);
  const author = asAuthor(res.author);
  return {
    author: { ...author, articleCount: author.articleCount ?? page.meta.total },
    articles: page.items.map(mapNewsItem),
    total: page.meta.total,
    totalPages: page.meta.totalPages,
  };
}

export function authorSlugFromArticle(item: NewsArticle): string {
  const ref = item.authorRef as { slug?: string; name?: string } | undefined;
  if (ref?.slug) return ref.slug;
  const name = ref?.name || item.author;
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || '';
}
