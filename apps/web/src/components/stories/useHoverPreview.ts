'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isDirectVideoUrl } from '../../utils/galleryEmbed';

/** Only a real pointer can hover; a touch device must never mount a preview on a sticky tap. */
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';

function useHasHover(): boolean {
  const [hasHover, setHasHover] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(HOVER_QUERY);
    const update = () => setHasHover(query.matches);
    update();
    // A tablet with a trackpad or a desktop that loses its mouse changes this at
    // runtime, so the rail cannot get stuck in the wrong mode.
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return hasHover;
}

export interface HoverPreview {
  /** Attach to the preview `<video>`. Only rendered while `playing`. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** True while the preview should be mounted and running. */
  playing: boolean;
  /** Spread onto the card. */
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Plays a muted inline preview while a story card is hovered.
 *
 * Two things this deliberately does not do. It does not load the video until the
 * pointer is actually on the card — a rail of a dozen stories would otherwise
 * pull a dozen clips on page load, which is the single most expensive mistake a
 * shorts shelf can make. And it stays off entirely without a fine pointer,
 * because a "hover" that survives a tap would start playback the reader never
 * asked for, on the most bandwidth-constrained devices.
 *
 * Falls back to the poster on a play rejection or a load error rather than
 * leaving a black rectangle where the artwork was.
 */
export function useHoverPreview(story: { mediaUrl: string; type: string }): HoverPreview {
  const canHover = useHasHover();
  const [hovering, setHovering] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const playable = story.type === 'video' && isDirectVideoUrl(story.mediaUrl);
  const playing = canHover && playable && hovering && !failed;

  // Reset the failure when the card goes away, so a transient error is retried
  // the next time the reader comes back to it.
  useEffect(() => {
    if (!hovering) setFailed(false);
  }, [hovering]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!playing) {
      el.pause();
      return;
    }
    el.currentTime = 0;
    const started = el.play() as Promise<void> | undefined;
    if (started && typeof started.catch === 'function') {
      started.catch(() => setFailed(true));
    }
  }, [playing]);

  // Never leave a clip running behind a card the pointer has left.
  useEffect(() => {
    const el = videoRef.current;
    return () => el?.pause();
  }, [playing]);

  const onMouseEnter = useCallback(() => setHovering(true), []);
  const onMouseLeave = useCallback(() => setHovering(false), []);

  return { videoRef, playing, onMouseEnter, onMouseLeave };
}
