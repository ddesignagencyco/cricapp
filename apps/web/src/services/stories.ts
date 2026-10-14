import { fetchGalleryItem, fetchGalleryPage, type GalleryMedia } from './gallery';
import { buildGalleryEmbedUrl, isDirectVideoUrl } from '../utils/galleryEmbed';

/**
 * Stories — the short-form surface of the existing media library.
 *
 * A story is not a new entity. Every field below is projected off `GalleryMedia`,
 * which the CMS already publishes (`/gallery/:id`), already serves as images /
 * shorts / videos, and already accepts uploads through the admin gallery page. So
 * the rail, the listing and the deep link all read real, editorial-managed media
 * and there is no second content store to keep in sync.
 *
 * What the projection adds is the short-form contract the media table does not
 * express: one normalised `type`, a poster that is never a video file, a stable
 * shareable path, and a rule for merging the two reel-ish source types.
 */
export type StoryMediaType = 'image' | 'video';

export interface Story {
  id: string;
  title: string;
  /**
   * URL segment for this story. `gallery_media` has no slug column and its ids
   * are UUIDs, so the id doubles as the slug: it is unique, stable across
   * re-uploads of metadata, and resolvable by the API in a single lookup.
   */
  slug: string;
  type: StoryMediaType;
  /** The playable/displayable asset. */
  mediaUrl: string;
  thumbnailUrl: string | null;
  /** What to paint before the video decodes. Null only for a video with no still. */
  posterUrl: string | null;
  /** Seconds. Null when the source did not report a length. */
  duration: number | null;
  caption: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  /** Canonical, shareable, works cold. */
  shareUrl: string;
  /** Where the same asset lives in the full gallery. */
  galleryUrl: string;
  /** Iframe source when the asset is an external embed (YouTube/Vimeo) rather than a file. */
  embedUrl: string | null;
}

export interface StoriesListParams {
  page?: number;
  limit?: number;
}

export interface StoriesPageResult {
  items: Story[];
  total: number;
  totalPages: number;
}

/**
 * Which gallery types a story can be. `short` is the 30s vertical clip and
 * `video` the 60s landscape one; both are short enough to be worth a progress
 * bar, which is what makes the section feel like stories rather than a gallery.
 */
const SOURCE_TYPES = ['short', 'video'] as const;

/** The gallery endpoint refuses anything above this, so a deep page cannot ask for more. */
const MAX_UPSTREAM_LIMIT = 100;

const DEFAULT_LIMIT = 12;

/** Anything that cannot be fetched is dropped rather than rendered as a broken tile. */
function renderableUrl(value?: string | null): string | null {
  const url = (value || '').trim();
  if (!url || url === '#') return null;
  if (url.startsWith('/') || /^https?:\/\//i.test(url)) return url;
  return null;
}

function storyPath(id: string): string {
  return `/stories/${encodeURIComponent(id)}`;
}

/** Project one gallery row onto the story contract, or null if its media is unusable. */
export function toStory(media: GalleryMedia): Story | null {
  const mediaUrl = renderableUrl(media.url);
  if (!mediaUrl || !media.id) return null;

  const type: StoryMediaType = media.type === 'image' ? 'image' : 'video';
  const thumbnailUrl = renderableUrl(media.thumbnailUrl);
  // A video poster must be a still: falling back to the video file would make
  // the browser download the clip just to paint a card.
  const posterUrl = thumbnailUrl || (type === 'image' ? mediaUrl : null);
  const embedUrl = type === 'video' && !isDirectVideoUrl(mediaUrl)
    ? buildGalleryEmbedUrl(mediaUrl)
    : null;

  return {
    id: media.id,
    title:
      (media.title || '').trim() ||
      (type === 'image' ? 'Photo' : media.type === 'short' ? 'Short' : 'Video'),
    slug: media.id,
    type,
    mediaUrl,
    thumbnailUrl,
    posterUrl,
    duration: typeof media.duration === 'number' && Number.isFinite(media.duration) ? media.duration : null,
    caption: (media.caption || '').trim() || null,
    publishedAt: media.createdAt || null,
    createdAt: media.createdAt || null,
    shareUrl: storyPath(media.id),
    galleryUrl: `/gallery/${encodeURIComponent(media.id)}`,
    embedUrl,
  };
}

function newestFirst(a: Story, b: Story): number {
  const left = a.publishedAt ? Date.parse(a.publishedAt) : 0;
  const right = b.publishedAt ? Date.parse(b.publishedAt) : 0;
  if (Number.isNaN(left) || Number.isNaN(right)) return 0;
  return right - left;
}

/**
 * One page of stories, merged across the two reel-ish gallery types.
 *
 * Each type is already ordered newest-first, so pulling `page * limit` rows out of
 * every type and re-sorting gives the same order a single combined query would:
 * an item inside the global top `page * limit` is necessarily inside its own
 * type's top `page * limit`. That is what makes the window correct without a
 * combined upstream endpoint. The take is capped at the API maximum, so deep
 * pages stay within one request per type rather than paginating indefinitely.
 */
export async function fetchStories(
  params: StoriesListParams = {},
  signal?: AbortSignal
): Promise<StoriesPageResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(MAX_UPSTREAM_LIMIT, Number(params.limit) || DEFAULT_LIMIT));
  const take = Math.min(MAX_UPSTREAM_LIMIT, page * limit);

  const results = await Promise.all(
    SOURCE_TYPES.map((type) => fetchGalleryPage({ page: 1, limit: take, type }, signal))
  );

  const seen = new Set<string>();
  const merged: Story[] = [];
  let total = 0;

  for (const result of results) {
    total += result.total || 0;
    for (const media of result.items) {
      const story = toStory(media);
      if (!story || seen.has(story.id)) continue;
      seen.add(story.id);
      merged.push(story);
    }
  }

  merged.sort(newestFirst);
  const start = (page - 1) * limit;

  return {
    items: merged.slice(start, start + limit),
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** A single story by id. Resolves null for an unknown id or unusable media. */
export async function fetchStoryById(id: string, signal?: AbortSignal): Promise<Story | null> {
  if (!id) return null;
  const media = await fetchGalleryItem(id, signal);
  return media ? toStory(media) : null;
}
