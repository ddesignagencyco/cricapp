import { apiGet, apiGetOptional, extractPage } from './api/client';
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
  const words = stripHtml(content).trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 180));
  return `${minutes} min read`;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export interface NewsAuthorRef {
  id: string;
  name: string;
  slug?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

function asIdList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((id) => String(id)).filter(Boolean) : [];
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
  const summary = stripHtml((item.summary as string) || '');
  const plainContent = stripHtml(contentStr);
  const authorRef = (item.authorRef as NewsAuthorRef | null) || null;

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
    author: authorRef?.name || (item.author as string) || 'Editorial Team',
    authorId: (item.authorId as string) || authorRef?.id || '',
    authorRef,
    readTime: calculateReadTime(contentStr),
    excerpt: summary || (plainContent ? `${plainContent.slice(0, 160)}${plainContent.length > 160 ? '…' : ''}` : ''),
    content: contentStr,
    image: (item.imageUrl as string) || undefined,
    imageGradient: undefined,
    relatedTeams: [],
    language: (item.language as string) || 'en',
    playerIds: asIdList(item.playerIds),
    teamIds: asIdList(item.teamIds),
    matchIds: asIdList(item.matchIds),
    seriesIds: asIdList(item.seriesIds),
  };
}

export interface NewsListParams {
  category?: string;
  tag?: string;
  q?: string;
  language?: string;
  page?: number;
  limit?: number;
  playerId?: string;
  teamId?: string;
  matchId?: string;
  seriesId?: string;
}

export async function fetchNews(
  { category, tag, q, language, playerId, teamId, matchId, seriesId, limit = 50 }: NewsListParams = {}
): Promise<NewsArticle[]> {
  const res = await apiGet('/news', { category, tag, q, language, playerId, teamId, matchId, seriesId, limit });
  return extractPage<Record<string, unknown>>(res).items.map(mapNewsItem);
}

export async function fetchNewsPage(
  { category, tag, q, language, playerId, teamId, matchId, seriesId, page = 1, limit = 12 }: NewsListParams = {}
): Promise<{ items: NewsArticle[]; total: number; totalPages: number }> {
  const res = await apiGet('/news', { category, tag, q, language, playerId, teamId, matchId, seriesId, page, limit });
  const { items, meta } = extractPage<Record<string, unknown>>(res);
  return {
    items: items.map(mapNewsItem),
    total: meta.total,
    totalPages: meta.totalPages,
  };
}

export async function fetchNewsById(idOrSlug: string): Promise<NewsArticle | null> {
  const item = await apiGetOptional<Record<string, unknown>>(`/news/${idOrSlug}`);
  if (!item) return null;
  return mapNewsItem(item);
}

export async function fetchNewsCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  const res = await apiGet<{ id: string; name: string; slug: string }[]>('/news/categories');
  return Array.isArray(res) ? res : [];
}
