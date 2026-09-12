import { fetchNewsPage, type NewsAuthorRef } from './news';
import type { NewsArticle } from '../types/index';

export interface PublicAuthor {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  articleCount: number;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'editorial';
}

export function authorSlugFromArticle(item: NewsArticle): string {
  const ref = item.authorRef as NewsAuthorRef | undefined;
  if (ref?.slug) return ref.slug;
  if (ref?.name) return slugify(ref.name);
  if (item.author) return slugify(item.author);
  return '';
}

function authorFromArticle(item: NewsArticle): PublicAuthor | null {
  const ref = item.authorRef as NewsAuthorRef | undefined;
  if (ref?.id) {
    return {
      id: ref.id,
      name: ref.name,
      slug: ref.slug || slugify(ref.name),
      bio: ref.bio ?? null,
      avatarUrl: ref.avatarUrl ?? null,
      articleCount: 0,
    };
  }
  const name = item.author?.trim();
  if (!name) return null;
  return {
    id: typeof item.authorId === 'string' ? item.authorId : '',
    name,
    slug: slugify(name),
    bio: null,
    avatarUrl: null,
    articleCount: 0,
  };
}

export async function fetchPublishedNewsPool(maxPages = 10): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetchNewsPage({ page, limit: 100 });
    all.push(...res.items);
    totalPages = res.totalPages || 1;
    page += 1;
  } while (page <= totalPages && page <= maxPages);
  return all;
}

export function authorsFromNews(items: NewsArticle[]): PublicAuthor[] {
  const map = new Map<string, PublicAuthor>();
  for (const item of items) {
    const author = authorFromArticle(item);
    if (!author) continue;
    const key = author.id || author.slug;
    const existing = map.get(key);
    if (existing) {
      existing.articleCount += 1;
      if (!existing.bio && author.bio) existing.bio = author.bio;
      if (!existing.avatarUrl && author.avatarUrl) existing.avatarUrl = author.avatarUrl;
    } else {
      map.set(key, { ...author, articleCount: 1 });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function articlesForAuthor(items: NewsArticle[], slug: string): NewsArticle[] {
  return items.filter((item) => authorSlugFromArticle(item) === slug);
}
