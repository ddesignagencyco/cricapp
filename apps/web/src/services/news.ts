import { apiGet, extractPage } from './api/client';
import type { NewsArticle } from '../types/index';

function mapNewsItem(item: Record<string, unknown>): NewsArticle {
  const category = (item.category as Record<string, unknown>) || {};
  const tags = item.tags as string[] | undefined;
  return {
    id: item.id as string,
    title: item.title as string,
    slug: item.slug as string,
    category: (category.name as string) || (item.categoryId as string) || '',
    type: (category.slug as string) || '',
    date: (item.publishedAt as string) || (item.createdAt as string) || '',
    tag: tags?.[0] || '',
    author: (item.author as string) || '',
    readTime: '3 min read',
    excerpt: (item.summary as string) || '',
    content: (item.content as string) || '',
    image: (item.imageUrl as string) || undefined,
    imageGradient: undefined,
    relatedTeams: [],
    ...item,
  };
}

export async function fetchNews(
  { category, tag, q }: { category?: string; tag?: string; q?: string } = {}
): Promise<NewsArticle[]> {
  const res = await apiGet('/news', { category, tag, q });
  return extractPage<Record<string, unknown>>(res).items.map(mapNewsItem);
}

export async function fetchNewsById(idOrSlug: string): Promise<NewsArticle | null> {
  const item = await apiGet<Record<string, unknown>>(`/news/${idOrSlug}`);
  if (!item) return null;
  return mapNewsItem(item);
}
