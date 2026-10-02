import {
  NEWS_LANGUAGES,
  NEWS_TITLE_MAX_WORDS,
  countWords,
  isEmptyRichText,
  isValidNewsSlug,
  slugifyNews,
} from '../utils/newsConstraints';
import type { NewsInput } from '../services/newsAdmin';

/**
 * Length limits the API enforces on `CreateNewsDto` / `UpdateNewsDto`. They are
 * declared there with `@MaxLength`, and the API answers 400 when a field is longer.
 * Mirrored here so the editor can count characters as the writer types and block an
 * oversized save, instead of letting the request fail after the writing is done.
 *
 * Source of truth: `apps/api/src/news/dto/news.dto.ts`. Change both together.
 */
export const NEWS_PUSH_TITLE_MAX = 150;
export const NEWS_PUSH_BODY_MAX = 500;
export const NEWS_SOCIAL_COPY_MAX = 2000;

/**
 * Advisory search-result lengths. The API sets no limit on the meta fields; these are
 * the sizes Google and Facebook truncate at, shown as guidance in the editor only.
 */
export const NEWS_META_TITLE_SUGGESTED = 60;
export const NEWS_META_DESCRIPTION_SUGGESTED = 160;

export interface NewsDraft {
  title: string;
  slug: string;
  content: string;
  language: string;
  pushNotificationTitle: string;
  pushNotificationBody: string;
  socialCopy: string;
}

export type NewsDraftErrors = Partial<Record<keyof NewsDraft, string>>;

function overLimitMessage(label: string, value: string, max: number): string | undefined {
  const length = value.trim().length;
  if (length <= max) return undefined;
  return `${label} is ${length} characters. The API accepts ${max} — trim ${length - max}.`;
}

/**
 * Every rule the editor enforces, in one place, so the message the writer is given and
 * the guard on save can never disagree. Returns only the fields that are wrong.
 */
export function validateNewsDraft(draft: NewsDraft): NewsDraftErrors {
  const errors: NewsDraftErrors = {};
  const title = draft.title.trim();

  if (!title) errors.title = 'Headline is required.';
  else if (countWords(title) > NEWS_TITLE_MAX_WORDS) {
    errors.title = `Headline must be ${NEWS_TITLE_MAX_WORDS} words or fewer.`;
  }

  const slug = draft.slug.trim();
  if (slug && !isValidNewsSlug(slug)) {
    errors.slug = 'Use letters, numbers, and hyphens only.';
  }

  if (isEmptyRichText(draft.content)) errors.content = 'Content is required.';

  if (draft.language && !NEWS_LANGUAGES.includes(draft.language as (typeof NEWS_LANGUAGES)[number])) {
    errors.language = 'Language must be English or Urdu.';
  }

  const pushTitle = overLimitMessage('Push title', draft.pushNotificationTitle, NEWS_PUSH_TITLE_MAX);
  if (pushTitle) errors.pushNotificationTitle = pushTitle;
  const pushBody = overLimitMessage('Push body', draft.pushNotificationBody, NEWS_PUSH_BODY_MAX);
  if (pushBody) errors.pushNotificationBody = pushBody;
  const social = overLimitMessage('Social copy', draft.socialCopy, NEWS_SOCIAL_COPY_MAX);
  if (social) errors.socialCopy = social;

  return errors;
}

/** Field labels in the order the editor shows them, used to summarise what is missing. */
export const NEWS_DRAFT_LABELS: Record<keyof NewsDraft, string> = {
  title: 'Headline',
  slug: 'Slug',
  content: 'Content',
  language: 'Language',
  pushNotificationTitle: 'Push title',
  pushNotificationBody: 'Push body',
  socialCopy: 'Social copy',
};

/**
 * What the byline should say after an author profile is picked.
 *
 * A byline the writer typed is never overwritten — that is how a guest writer's name
 * differs from the profile. An auto-filled or empty byline follows the profile, so the
 * common case is one click instead of typing the same name twice.
 */
export function bylineForProfile(
  profileName: string,
  currentByline: string,
  currentIsAuto: boolean,
): { byline: string; isAuto: boolean } {
  const name = profileName.trim();
  if (!name) return { byline: currentByline, isAuto: currentIsAuto };
  if (currentIsAuto || !currentByline.trim()) return { byline: name, isAuto: true };
  return { byline: currentByline, isAuto: false };
}

/**
 * The fields still blocking a save, in reading order. Empty means the draft is ready.
 * Optional fields with a problem (an over-long push title) are included: they would be
 * rejected by the API, so the editor says so before the writer hits save.
 */
export function blockingNewsFields(errors: NewsDraftErrors): { field: keyof NewsDraft; label: string }[] {
  return (Object.keys(NEWS_DRAFT_LABELS) as (keyof NewsDraft)[])
    .filter((field) => errors[field])
    .map((field) => ({ field, label: NEWS_DRAFT_LABELS[field] }));
}

/** Everything the editor holds, i.e. every field `CreateNewsDto` accepts. */
export interface NewsFormValues extends NewsDraft {
  summary: string;
  imageUrl: string;
  author: string;
  authorId: string;
  source: string;
  categoryId: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  players: { id: string }[];
  teams: { id: string }[];
  matches: { id: string }[];
  series: { id: string }[];
}

/**
 * The request body for `POST /news`, `PATCH /news/:id` and `POST /news/:id/translations`.
 *
 * Every key here is a field on the API's `CreateNewsDto` / `UpdateNewsDto`, and blank
 * optional fields are left out rather than sent as empty strings, so the API keeps its
 * own defaults instead of storing a blank. `title`, `content` and `isPublished` are
 * always present; the API requires the first two.
 */
export function buildNewsPayload(form: NewsFormValues, publish: boolean): NewsInput {
  const title = form.title.trim();
  const slug = slugifyNews(form.slug.trim() || title);
  const payload: NewsInput = {
    title,
    content: form.content.trim(),
    isPublished: publish,
  };
  // One line per DTO field, in the order the API declares them.
  if (slug) payload.slug = slug;
  if (form.summary.trim()) payload.summary = form.summary.trim();
  if (form.imageUrl.trim()) payload.imageUrl = form.imageUrl.trim();
  if (form.author.trim()) payload.author = form.author.trim();
  if (form.authorId.trim()) payload.authorId = form.authorId.trim();
  if (form.source.trim()) payload.source = form.source.trim();
  if (form.categoryId.trim()) payload.categoryId = form.categoryId.trim();
  if (form.language.trim()) payload.language = form.language.trim();
  if (form.metaTitle.trim()) payload.metaTitle = form.metaTitle.trim();
  if (form.metaDescription.trim()) payload.metaDescription = form.metaDescription.trim();
  if (form.canonicalUrl.trim()) payload.canonicalUrl = form.canonicalUrl.trim();
  if (form.pushNotificationTitle.trim()) payload.pushNotificationTitle = form.pushNotificationTitle.trim();
  if (form.pushNotificationBody.trim()) payload.pushNotificationBody = form.pushNotificationBody.trim();
  if (form.socialCopy.trim()) payload.socialCopy = form.socialCopy.trim();
  payload.playerIds = form.players.map((row) => row.id);
  payload.teamIds = form.teams.map((row) => row.id);
  payload.matchIds = form.matches.map((row) => row.id);
  payload.seriesIds = form.series.map((row) => row.id);
  return payload;
}
