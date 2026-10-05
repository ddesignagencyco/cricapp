import { Clapperboard, Play } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import { useHoverPreview } from './useHoverPreview';
import { formatMediaDuration } from '../../utils/helpers';
import type { Story } from '../../services/stories';

interface StoryRailCardProps {
  story: Story;
  onOpen: () => void;
}

/**
 * Width drives the tile, not height.
 *
 * A button is a flex item with no intrinsic width, and everything inside it is
 * absolutely positioned, so nothing would give it a size on its own — the box
 * collapses to a couple of pixels. Setting the width and letting `aspect-[9/16]`
 * derive the height is the one combination that cannot collapse, and because the
 * width is a clamp on the viewport the rail can never push the page sideways.
 */
const CARD = 'w-[clamp(7.5rem,13vw,9.5rem)] aspect-[9/16]';

/** The small white play badge in the corner of every tile. */
const BADGE = 'absolute left-2 top-2 grid h-[22px] w-[22px] place-items-center rounded-md bg-white/95 shadow-sm';

/** One tile in the homepage shorts rail: a full-bleed poster with its title on top. */
export default function StoryRailCard({ story, onOpen }: StoryRailCardProps) {
  const isVideo = story.type === 'video';
  const preview = useHoverPreview(story);

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={preview.onMouseEnter}
      onMouseLeave={preview.onMouseLeave}
      className={`group relative shrink-0 snap-start overflow-hidden rounded-[10px] bg-secondary text-left ring-1 ring-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${CARD}`}
      aria-label={`${isVideo ? 'Play' : 'View'} story: ${story.title}`}
    >
      {/*
        The preview replaces the poster rather than sitting over it, so a clip
        that fails to decode leaves the artwork already in place underneath.
      */}
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
          onError={() => undefined}
        />
      ) : story.posterUrl ? (
        <RemoteImage
          src={story.posterUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 10rem, 8rem"
          fit="cover"
          className="news-image"
        />
      ) : (
        <span className="media-fallback block h-full w-full" />
      )}

      {/* The poster is arbitrary, so this is the only thing keeping a bright
          still from swallowing the title. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/35 to-transparent"
      />

      <span aria-hidden="true" className={BADGE}>
        {isVideo ? (
          <Play size={11} className="translate-x-px fill-black text-black" />
        ) : (
          <Clapperboard size={12} className="text-black" />
        )}
      </span>

      {isVideo ? (
        <span className="absolute right-2 top-2 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white ring-1 ring-white/20">
          {formatMediaDuration(story.duration)}
        </span>
      ) : null}

      <span className="absolute inset-x-0 bottom-0 p-2.5">
        <span className="line-clamp-2 text-xs font-bold leading-snug text-white">
          {story.title}
        </span>
      </span>
    </button>
  );
}
