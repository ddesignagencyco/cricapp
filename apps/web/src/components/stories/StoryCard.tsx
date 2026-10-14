import Link from 'next/link';
import { Clapperboard, Play } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import MediaActions from '../MediaActions';
import { useHoverPreview } from './useHoverPreview';
import { formatMediaDuration, formatPublishedDate } from '../../utils/helpers';
import type { Story } from '../../services/stories';

interface StoryCardProps {
  story: Story;
  /**
   * Opens the story in the shared media viewer instead of navigating.
   *
   * Omitted on the server-rendered listing, where the card is a plain deep link.
   * When it is supplied the underlying element is still a real <Link>, so
   * middle-click, "open in new tab" and a crawler all still reach the story page
   * — and a modified click keeps that behaviour instead of being swallowed by
   * the viewer.
   */
  onOpen?: () => void;
  /** Marks the card as the one the current URL points at. */
  active?: boolean;
  className?: string;
  /** `sizes` hint for the poster, relative to the container. */
  sizes?: string;
}

/**
 * The share chip is always visible on phones, where there is no hover to reveal
 * it, and fades in on pointer devices so the rail stays quiet at rest.
 */
const ACTION_REVEAL =
  'absolute right-1.5 top-1.5 z-10 flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100';

export default function StoryCard({
  story,
  onOpen,
  active = false,
  className = '',
  sizes = '180px',
}: StoryCardProps) {
  const isVideo = story.type === 'video';
  const duration = isVideo ? formatMediaDuration(story.duration) : null;
  const published = story.publishedAt ? formatPublishedDate(story.publishedAt) : '';
  const preview = useHoverPreview(story);

  return (
    <article
      onMouseEnter={preview.onMouseEnter}
      onMouseLeave={preview.onMouseLeave}
      className={`group relative flex flex-col overflow-hidden rounded-lg bg-card ring-1 transition-shadow ${
        active ? 'ring-brand' : 'ring-lborder'
      } ${className}`.trim()}
    >
      <Link
        href={story.shareUrl}
        onClick={(event) => {
          if (!onOpen) return;
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          onOpen();
        }}
        className="card-interactive flex flex-1 flex-col rounded-lg"
        aria-label={`${isVideo ? 'Play' : 'View'} story: ${story.title}`}
      >
        <span className="relative block aspect-[9/16] w-full overflow-hidden bg-secondary">
          {preview.playing ? (
            <video
              ref={preview.videoRef}
              src={story.mediaUrl}
              poster={story.posterUrl || undefined}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          ) : story.posterUrl ? (
            <RemoteImage
              src={story.posterUrl}
              alt={story.title}
              fill
              sizes={sizes}
              fit="cover"
              className="news-image"
            />
          ) : (
            <span className="media-fallback block h-full w-full" />
          )}
          {/* Keeps the title legible over any poster without a hard-coded tint. */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          {duration ? (
            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white ring-1 ring-white/15">
              {duration}
            </span>
          ) : null}

          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white ring-1 ring-white/25 transition-transform group-hover:scale-105">
              {isVideo ? (
                <Play size={15} className="translate-x-[1px] fill-current" aria-hidden="true" />
              ) : (
                <Clapperboard size={15} aria-hidden="true" />
              )}
            </span>
          </span>
        </span>

        <span className="flex flex-1 flex-col gap-1 p-2.5">
          <span className="line-clamp-2 text-xs font-semibold leading-snug text-mtext group-hover:text-accent">
            {story.title}
          </span>
          {published ? <span className="text-[11px] text-stext">{published}</span> : null}
        </span>
      </Link>

      {/*
        Share + download, not resolved through the API share endpoint: that
        endpoint hands back the gallery path, and a story has to share the story
        URL so the recipient lands on the same deep link. `shareHref` alone keeps
        the link stable and skips a request on a rail that shows a chip per card.
      */}
      <div className={ACTION_REVEAL}>
        <MediaActions
          url={story.mediaUrl}
          title={story.title}
          shareHref={story.shareUrl}
          shareText={story.caption || undefined}
          variant="badge"
          size="xs"
        />
      </div>
    </article>
  );
}
