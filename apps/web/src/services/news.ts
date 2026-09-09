import { apiGet, extractPage } from './api/client';
import type { NewsArticle } from '../types/index';

function formatNewsDate(val: unknown): string {
  if (!val) return '';
  try {
    const d = new Date(String(val));
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
}

function calculateReadTime(content: unknown): string {
  if (typeof content !== 'string' || !content.trim()) return '2 min read';
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 180));
  return `${minutes} min read`;
}

function mapNewsItem(item: Record<string, unknown>): NewsArticle {
  const catObj = (item.category as Record<string, unknown>) || {};
  const rawTags = item.tags;
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags.map((t) => (typeof t === 'string' ? t : String(t))).filter(Boolean)
    : [];

  const categoryName =
    (catObj.name as string) ||
    (typeof item.category === 'string' ? item.category : '') ||
    (item.categoryId as string) ||
    'Cricket';

  const rawDate = (item.publishedAt as string) || (item.createdAt as string) || '';
  const dateFormatted = formatNewsDate(rawDate);
  const contentStr = (item.content as string) || '';

  return {
    ...item,
    id: item.id as string,
    title: (item.title as string) || 'Untitled Story',
    slug: (item.slug as string) || '',
    category: categoryName,
    type: (catObj.slug as string) || '',
    date: dateFormatted,
    tag: tags[0] || '',
    tags: tags,
    author: (item.author as string) || 'Editorial Team',
    readTime: calculateReadTime(contentStr),
    excerpt: (item.summary as string) || (contentStr ? contentStr.slice(0, 160) + '…' : ''),
    content: contentStr,
    image: (item.imageUrl as string) || undefined,
    imageGradient: undefined,
    relatedTeams: [],
  };
}

export async function fetchNews(
  { category, tag, q, limit = 50 }: { category?: string; tag?: string; q?: string; limit?: number } = {}
): Promise<NewsArticle[]> {
  const res = await apiGet('/news', { category, tag, q, limit });
  return extractPage<Record<string, unknown>>(res).items.map(mapNewsItem);
}

export async function fetchNewsById(idOrSlug: string): Promise<NewsArticle | null> {
  const item = await apiGet<Record<string, unknown>>(`/news/${idOrSlug}`);
  if (!item) return null;
  return mapNewsItem(item);
}

export async function fetchNewsCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  const res = await apiGet<{ id: string; name: string; slug: string }[]>('/news/categories');
  return Array.isArray(res) ? res : [];
}
