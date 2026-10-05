'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import MediaActions from '../MediaActions';
import useFocusTrap from '../../hooks/useFocusTrap';
import { buildGalleryEmbedUrl, isDirectVideoUrl } from '../../utils/galleryEmbed';
import { formatMediaDuration, formatPublishedDate } from '../../utils/helpers';
import type { Story } from '../../services/stories';

interface StoryViewerProps {
  stories: Story[];
  /** Which story to open at. */
  index: number;
  onClose: () => void;
  onIndexChange: (_index: number) => void;
}

/** Press-and-hold this long before it counts as "hold" rather than a tap. */
const HOLD_DELAY_MS = 220;

/** Tapping the far left/right third pages; the middle third toggles playback. */
const EDGE_ZONE = 0.34;

const iconButton = 'btn-on-media on-media grid h-9 w-9 place-items-center rounded-full';
const smallControl = 'btn-on-media on-media grid h-8 w-8 place-items-center rounded-full';

type MediaStatus = 'loading' | 'ready' | 'error';

/**
 * The story player.
 *
 * A dedicated overlay rather than an extension of the gallery clip viewer, because
 * the two are genuinely different products: this one owns a whole sequence, so it
 * needs the segmented progress track, press-and-hold to pause, and edge taps to
 * page — none of which make sense on a gallery clip you opened directly.
 *
 * Layout follows the stories players readers already know: full-bleed on a phone,
 * a centred 9:16 panel from `sm` up, progress segments and a title bar on top,
 * controls underneath. Chrome dims while a press is held so the media is unobstructed.
 */
export default function StoryViewer({
  stories,
  index,
  onClose,
  onIndexChange,
}: StoryViewerProps) {
  const story = stories[index];
  const isVideo = story?.type === 'video';
  // Only a file we can hand to <video> is ours to control; an embed owns its player.
  const directVideo = Boolean(isVideo && isDirectVideoUrl(story?.mediaUrl));
  const embed = !directVideo && isVideo ? buildGalleryEmbedUrl(story?.mediaUrl) : null;

  const [status, setStatus] = useState<MediaStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [holding, setHolding] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const holdTimer = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const dialogRef = useFocusTrap<HTMLDivElement>(Boolean(story));

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  // Every story starts at the top, unpaused and silent — the only state a browser
  // will autoplay without a gesture.
  useEffect(() => {
    setProgress(0);
    setPaused(false);
    setMuted(true);
    setBlocked(false);
    setHolding(false);
    holdingRef.current = false;
    setStatus('loading');
    setAttempt(0);
    clearHoldTimer();
  }, [story?.id, clearHoldTimer]);

  // Owns the media element for its whole life. Keying on the story id remounts it
  // per story, and the cleanup pause is what guarantees only one clip is ever
  // audible — including when the viewer unmounts mid-playback.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !directVideo) return;
    el.muted = muted;
    if (paused) {
      el.pause();
      return;
    }
    let cancelled = false;
    // `play()` is only a promise in a real browser; jsdom and some older engines
    // return undefined, so the rejection that signals a blocked autoplay is
    // reported rather than thrown.
    const played = el.play() as Promise<void> | undefined;
    if (played && typeof played.then === 'function') {
      played
        .then(() => {
          if (!cancelled) setBlocked(false);
        })
        .catch(() => {
          if (!cancelled) setBlocked(true);
        });
    }
    return () => {
      cancelled = true;
      el.pause();
    };
  }, [directVideo, muted, paused, story?.id, attempt]);

  const goNext = useCallback(() => {
    if (index < stories.length - 1) onIndexChange(index + 1);
    else onClose();
  }, [index, stories.length, onIndexChange, onClose]);

  const endHold = useCallback(() => {
    clearHoldTimer();
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    setPaused(false);
  }, [clearHoldTimer]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'ArrowRight' && index < stories.length - 1) onIndexChange(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (event.key === ' ' && directVideo) {
        // Space is a native control on anything focusable inside the dialog.
        const tag = (event.target as HTMLElement | null)?.tagName;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return;
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, stories.length, directVideo, onClose, onIndexChange]);

  // A pointer released outside the window never fires pointerup, which would
  // otherwise leave the player stuck paused.
  useEffect(() => {
    window.addEventListener('pointerup', endHold);
    window.addEventListener('pointercancel', endHold);
    return () => {
      window.removeEventListener('pointerup', endHold);
      window.removeEventListener('pointercancel', endHold);
    };
  }, [endHold]);

  if (!story) return null;

  const zoneAt = (clientX: number): 'prev' | 'next' | 'center' => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 'center';
    const ratio = (clientX - rect.left) / rect.width;
    if (ratio < EDGE_ZONE) return 'prev';
    if (ratio > 1 - EDGE_ZONE) return 'next';
    return 'center';
  };

  const onPointerDown = () => {
    if (!directVideo) return;
    clearHoldTimer();
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      holdingRef.current = true;
      setHolding(true);
      setPaused(true);
    }, HOLD_DELAY_MS);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const wasHolding = holdingRef.current;
    clearHoldTimer();
    if (wasHolding) {
      endHold();
      return;
    }
    const zone = zoneAt(event.clientX);
    if (zone === 'prev' && index > 0) onIndexChange(index - 1);
    else if (zone === 'next' && index < stories.length - 1) onIndexChange(index + 1);
    // A centre tap on a still has nothing to toggle, so it does nothing rather
    // than pretending the image is paused.
    else if (zone === 'center' && directVideo) setPaused((value) => !value);
  };

  // Only a timed medium gets a countdown. A still has no length to run out and
  // the brief is explicit about not auto-advancing it, so its segment sits full
  // and the reader stays until they tap.
  const fraction = directVideo ? progress : 1;
  const published = story.publishedAt ? formatPublishedDate(story.publishedAt) : '';
  const meta = [
    isVideo ? formatMediaDuration(story.duration) : null,
    published || null,
  ].filter(Boolean);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={story.title || 'Story'}
    >
      {/*
        Full-bleed on a phone, where the phone is already the right shape; a
        centred 9:16 panel everywhere else so it does not stretch on desktop.
      */}
      <div className="relative aspect-[9/16] w-full max-h-full overflow-hidden bg-black sm:h-[min(92vh,860px)] sm:max-h-[92vh] sm:rounded-2xl sm:ring-1 sm:ring-white/10">
        <div
          ref={surfaceRef}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={endHold}
          className="absolute inset-0 z-0 touch-none"
        />

        <div className="absolute inset-0">
          {directVideo ? (
            <>
              <video
                key={`${story.id}-${attempt}`}
                ref={videoRef}
                src={story.mediaUrl}
                poster={story.posterUrl || undefined}
                className="h-full w-full bg-black"
                playsInline
                preload="metadata"
                onLoadedData={() => setStatus('ready')}
                onError={() => setStatus('error')}
                onTimeUpdate={(event) => {
                  const el = event.currentTarget;
                  const length = el.duration;
                  setProgress(
                    length && Number.isFinite(length) && length > 0
                      ? Math.min(1, el.currentTime / length)
                      : 0
                  );
                }}
                onEnded={goNext}
              />
              {status === 'loading' ? (
                <span
                  className="text-on-media-muted pointer-events-none absolute inset-0 z-10 grid place-items-center"
                  role="status"
                >
                  <Loader2 size={26} className="animate-spin" aria-hidden="true" />
                  <span className="sr-only">Loading story</span>
                </span>
              ) : null}
              {status === 'error' ? (
                <div
                  className="absolute inset-0 z-20 grid place-items-center gap-3 bg-black/70 p-4 text-center"
                  role="alert"
                >
                  <p className="text-on-media text-sm font-semibold">
                    This story could not be played.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('loading');
                      setAttempt((value) => value + 1);
                    }}
                    className="btn-on-media on-media rounded-full px-3 py-1.5 text-xs font-semibold"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
              {blocked ? (
                <button
                  type="button"
                  onClick={() => setPaused(false)}
                  className="absolute inset-0 z-20 grid place-items-center"
                  aria-label="Play story"
                >
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/25">
                    <Play size={26} className="translate-x-[1px] fill-current" aria-hidden="true" />
                  </span>
                </button>
              ) : null}
            </>
          ) : embed ? (
            <iframe
              title={story.title}
              src={embed}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : story.posterUrl ? (
            <RemoteImage
              src={story.posterUrl}
              alt={story.title}
              fill
              sizes="(max-width: 640px) 100vw, 420px"
              fit="cover"
              className="news-image"
            />
          ) : (
            <div className="media-fallback h-full w-full" />
          )}
        </div>

        {/* Chrome dims on a held press so the media is left unobstructed. */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 z-20 px-3 pt-3 transition-opacity duration-200 ${
            holding ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex items-center gap-1" aria-hidden="true">
            {stories.map((entry, position) => (
              <span
                key={entry.id}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <span
                  className="block h-full rounded-full bg-white transition-[width] duration-150 ease-linear"
                  style={{
                    width:
                      position < index
                        ? '100%'
                        : position === index
                          ? `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`
                          : '0%',
                  }}
                />
              </span>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-2.5">
            {story.posterUrl ? (
              <RemoteImage
                src={story.posterUrl}
                alt=""
                width={32}
                height={32}
                sizes="32px"
                fit="cover"
                className="news-image shrink-0 rounded-full ring-1 ring-white/25"
              />
            ) : (
              <span className="h-8 w-8 shrink-0 rounded-full bg-white/20" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-on-media line-clamp-1 text-xs font-semibold">{story.title}</p>
              {meta.length > 0 ? (
                <p className="text-on-media-muted text-[10px] font-medium">{meta.join(' · ')}</p>
              ) : null}
            </div>
            <p className="text-on-media-muted shrink-0 text-[11px] font-semibold tabular-nums">
              {index + 1}/{stories.length}
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`${iconButton} pointer-events-auto shrink-0`}
              aria-label="Close story"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-12 transition-opacity duration-200 ${
            holding ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {story.caption ? (
            <p className="text-on-media-muted line-clamp-3 text-xs leading-relaxed">
              {story.caption}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {directVideo ? (
              <>
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  className={`${smallControl} pointer-events-auto`}
                  aria-label={paused ? 'Play story' : 'Pause story'}
                  aria-pressed={paused}
                >
                  {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((value) => !value)}
                  className={`${smallControl} pointer-events-auto`}
                  aria-label={muted ? 'Unmute story' : 'Mute story'}
                  aria-pressed={!muted}
                >
                  {muted ? <VolumeX size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
                </button>
              </>
            ) : null}
            <span className="pointer-events-auto">
              <MediaActions
                url={story.mediaUrl}
                title={story.title}
                shareHref={story.shareUrl}
                shareText={story.caption || undefined}
                /*
                 * Not resolved through the API share endpoint: that answers with
                 * the gallery path, and a shared story has to carry the story's
                 * own canonical url so the recipient lands on the same page.
                 */
                variant="media"
                size="sm"
              />
            </span>
            <Link
              href={story.shareUrl}
              className="text-on-media on-media pointer-events-auto ml-auto text-xs font-semibold underline underline-offset-2"
            >
              Open story
            </Link>
          </div>
        </div>

        {/* Visible page affordance for pointer users; the surface handles taps. */}
        <div className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onIndexChange(index - 1)}
            className={iconButton}
            aria-label="Previous story"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={index === stories.length - 1}
            onClick={goNext}
            className={iconButton}
            aria-label="Next story"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
