import Link from 'next/link';
import { notFound } from 'next/navigation';
import RemoteImage from '../../../components/RemoteImage';
import MediaActions from '../../../components/MediaActions';
import StoryStage from '../../../components/stories/StoryStage';
import { fetchStories, fetchStoryById, type Story } from '../../../services/stories';
import { buildGalleryEmbedUrl, isDirectVideoUrl } from '../../../utils/galleryEmbed';
import { formatMediaDuration, formatPublishedDate } from '../../../utils/helpers';
import { sharePageMetadata } from '../../../services/sharing';

export const revalidate = 300;

/** How many neighbours the deep-linked viewer can page through. */
const SIBLING_LIMIT = 20;

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function loadStory(id: string): Promise<Story | null> {
  return fetchStoryById(decode(id)).catch(() => null);
}

/**
 * The other stories to hand the viewer, so next/prev has somewhere to go from a
 * cold deep link. Falls back to the story alone when it is not on the first page.
 */
async function loadSiblings(story: Story): Promise<{ items: Story[]; index: number }> {
  const page = await fetchStories({ page: 1, limit: SIBLING_LIMIT }).catch(() => null);
  const index = page ? page.items.findIndex((entry) => entry.id === story.id) : -1;
  if (!page || index < 0) return { items: [story], index: 0 };
  return { items: page.items, index };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await loadStory(id);
  if (!story) return { title: 'Story' };
  return sharePageMetadata({
    title: story.title,
    description: story.caption || `${story.title} — Stories from PAK CRICZONE.`,
    image: story.posterUrl,
    path: `/stories/${id}`,
    ogType: 'video.other',
  });
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await loadStory(id);
  if (!story) notFound();

  const siblings = await loadSiblings(story);
  const title = story.title;
  const preview = story.posterUrl || story.mediaUrl;
  const embed = story.type === 'video' && !isDirectVideoUrl(story.mediaUrl)
    ? buildGalleryEmbedUrl(story.mediaUrl)
    : null;
  const meta = [
    story.type === 'video' ? formatMediaDuration(story.duration) : null,
    story.publishedAt ? formatPublishedDate(story.publishedAt) : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-stext">
        <Link href="/stories" className="font-semibold text-accent hover:underline">
          Stories
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-mtext">{title}</span>
      </nav>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-mtext sm:text-2xl">{title}</h1>
          {meta.length > 0 ? <p className="mt-1 text-xs text-stext">{meta.join(' · ')}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MediaActions
            url={story.mediaUrl}
            title={title}
            shareHref={story.shareUrl}
            shareText={story.caption || undefined}
            variant="card"
          />
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl bg-secondary ring-1 ring-lborder">
        {story.type === 'video' && embed ? (
          <iframe
            title={title}
            src={embed}
            className="aspect-video w-full"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : story.type === 'video' ? (
          // Intrinsic dimensions are declared so the box holds its 9:16 shape
          // before the metadata request resolves; otherwise the player pops in.
          <video
            src={story.mediaUrl}
            poster={story.posterUrl || undefined}
            width={720}
            height={1280}
            className="mx-auto aspect-[9/16] max-h-[70vh] w-auto bg-black sm:aspect-video sm:h-auto sm:w-full"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="relative aspect-[9/16] w-full bg-secondary sm:aspect-[16/10]">
            {story.posterUrl ? (
              <RemoteImage
                src={preview}
                alt={title}
                fill
                sizes="(min-width: 1024px) 56rem, 100vw"
                fit="cover"
                className="news-image"
              />
            ) : (
              <div className="h-full w-full media-fallback" />
            )}
          </div>
        )}
      </div>

      <StoryStage items={siblings.items} initialIndex={siblings.index} />

      {story.caption ? (
        <p className="mt-4 text-sm leading-relaxed text-stext">{story.caption}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link href="/stories" className="text-sm font-semibold text-accent hover:underline">
          &larr; Back to Stories
        </Link>
        <Link href={story.galleryUrl} className="text-sm font-semibold text-stext hover:text-mtext hover:underline">
          Open in Gallery
        </Link>
      </div>
    </div>
  );
}
