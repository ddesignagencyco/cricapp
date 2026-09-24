/** Mirrors NewsService.validateTitle — 1 to 50 words. */
export const NEWS_TITLE_MAX_WORDS = 50;

/** Mirrors CreateNewsDto / UpdateNewsDto slug Matches(). */
export const NEWS_SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

export const NEWS_LANGUAGES = ['en', 'ur'] as const;
export type NewsLanguage = (typeof NEWS_LANGUAGES)[number];

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Same slugify as apps/api/src/news/news.service.ts — letters in any script, numbers, hyphens. */
export function slugifyNews(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');
}

export function isValidNewsSlug(slug: string): boolean {
  return NEWS_SLUG_PATTERN.test(slug);
}

export function isUrduLanguage(language?: string | null): boolean {
  const value = (language || '').trim().toLowerCase();
  return value === 'ur' || value === 'urdu';
}

export function otherNewsLanguage(language?: string | null): NewsLanguage {
  return isUrduLanguage(language) ? 'en' : 'ur';
}

export function newsListPath(
  language: NewsLanguage = 'en',
  query?: { category?: string; tag?: string; page?: number | string },
): string {
  const params = new URLSearchParams();
  const category = query?.category?.trim();
  const tag = query?.tag?.trim();
  const page = Number(query?.page) || 1;
  if (category && category !== 'all') params.set('category', category);
  if (tag) params.set('tag', tag);
  if (page > 1) params.set('page', String(page));
  const base = language === 'ur' ? '/ur/news' : '/news';
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Public article URL. Slug path is news-only; other entities stay on ids. */
export function newsHref(article: { id: string; slug?: string | null; language?: string | null }): string {
  const slug = typeof article.slug === 'string' ? article.slug.trim() : '';
  const prefix = isUrduLanguage(article.language) ? '/ur' : '';
  if (slug) {
    return prefix ? `${prefix}/news/${slug}` : `/cricket-news/${slug}`;
  }
  return `${prefix}/news/${article.id}`;
}

export function isEmptyRichText(html: string): boolean {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim().length === 0;
}
