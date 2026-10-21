'use client';

import { useEffect, useRef, useState } from 'react';
import Badge from '../Badge';
import {
  LEADERBOARD_SLOT_META,
  dummyAdAlt,
  resolveDummyAdCreative,
  type LeaderboardVariant,
} from '../../lib/advertisements/placements';

/**
 * Renders exactly one standard IAB/AdSense leaderboard size for the space the
 * slot actually has: 970×90, 728×90, 468×60 or 320×100.
 *
 * The variant is picked from the *container* width, not the viewport, because a
 * leaderboard inside a 7/10 main column has far less room than the viewport
 * suggests. The creative is always drawn at its exact pixel size and centred —
 * it is never stretched to the column width, which would produce a non-standard
 * box no real ad unit could fill.
 *
 * The box size comes from CSS container queries, so the server-rendered HTML already
 * has the right size and nothing below it moves when the page hydrates (it used to
 * render 320×100 and then shrink to 970×90: a 10px layout shift on every page). The
 * ResizeObserver only picks which creative to show; the breakpoints below mirror
 * `fitLeaderboardVariant` and LEADERBOARD_SLOT_META.
 */
const BOX_CLASSES =
  'w-[320px] @[468px]:w-[468px] @[728px]:w-[728px] @[970px]:w-[970px]';
const FRAME_CLASSES =
  'aspect-[320/100] @[468px]:aspect-[468/60] @[728px]:aspect-[728/90] @[970px]:aspect-[970/90]';

const VARIANTS_LARGEST_FIRST: LeaderboardVariant[] = ['wide', 'desktop', 'tablet', 'mobile'];

/**
 * Banners that open a page. Lazy-loading them deferred the request until layout,
 * which made the first screen's largest image the last to arrive (Lighthouse:
 * "LCP image was lazily loaded").
 */
const ABOVE_THE_FOLD = /^(global-top|home-top-mobile|match-detail-leaderboard|news-detail-top|.+-after-intro)$/;

export function fitLeaderboardVariant(containerWidth: number): LeaderboardVariant {
  return (
    VARIANTS_LARGEST_FIRST.find((variant) => LEADERBOARD_SLOT_META[variant].width <= containerWidth) ??
    'mobile'
  );
}

export default function ResponsiveLeaderboard({ placement }: { placement: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [variant, setVariant] = useState<LeaderboardVariant>('mobile');

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setVariant(fitLeaderboardVariant(entry.contentRect.width));
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const creative = resolveDummyAdCreative('leaderboard', placement, variant);
  const meta = LEADERBOARD_SLOT_META[variant];

  return (
    <div ref={hostRef} className="@container flex w-full min-w-0 max-w-full justify-center">
      <aside
        data-ad-placement={placement}
        data-ad-size={`${meta.width}x${meta.height}`}
        aria-label="Advertisement"
        className={`relative flex min-w-0 max-w-full flex-col ${BOX_CLASSES}`}
      >
        <span aria-hidden="true" data-ad-badge="" className="absolute right-2 top-2 z-10">
          <Badge tone="neutral" className="shadow-sm">
            Ad
          </Badge>
        </span>
        <div
          className={`relative w-full overflow-hidden rounded-md border border-lborder bg-secondary ${FRAME_CLASSES}`}
        >
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- external placeholder creatives */}
            <img
              src={creative.src}
              alt={dummyAdAlt(creative.advertiser, creative.line)}
              width={meta.width}
              height={meta.height}
              loading={ABOVE_THE_FOLD.test(placement) ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              className="pointer-events-none block h-full w-full select-none"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
