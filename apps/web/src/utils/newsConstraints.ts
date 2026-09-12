/** Mirrors NewsService.validateTitle — 1 to 50 words. */
export const NEWS_TITLE_MAX_WORDS = 50;

/** Mirrors CreateNewsDto / UpdateNewsDto slug Matches(). */
export const NEWS_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const NEWS_LANGUAGES = ['en', 'ur'] as const;
export type NewsLanguage = (typeof NEWS_LANGUAGES)[number];

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Same slugify as apps/api/src/news/news.service.ts */
export function slugifyNews(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function isValidNewsSlug(slug: string): boolean {
  return NEWS_SLUG_PATTERN.test(slug);
}

export function isEmptyRichText(html: string): boolean {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').trim().length === 0;
}
