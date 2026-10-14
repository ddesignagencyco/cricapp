'use client';

import { useSyncExternalStore } from 'react';
import Badge from '../Badge';
import {
  LEADERBOARD_SLOT_META,
  dummyAdAlt,
  resolveDummyAdCreative,
  type LeaderboardVariant,
} from '../../lib/advertisements/placements';

/**
 * Renders exactly one leaderboard variant for the current viewport instead of
 * all four behind `display:none` toggles. Hidden `<img>` elements still
 * download, so the old four-variant markup issued up to 4 requests per slot
 * (12 on the homepage) for a single visible creative.
 *
 * Breakpoints mirror the previous CSS (`min-[1200px]`, `min-[800px]`,
 * `min-[500px]`). The server renders `mobile`; after hydration the store
 * settles on the real variant. Each variant's frame keeps its own aspect ratio,
 * so the swap never shifts surrounding content beyond the slot's own box.
 */
const QUERIES: { variant: LeaderboardVariant; query: string }[] = [
  { variant: 'wide', query: '(min-width: 1200px)' },
  { variant: 'desktop', query: '(min-width: 800px)' },
  { variant: 'tablet', query: '(min-width: 500px)' },
];

function pickVariant(): LeaderboardVariant {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return 'mobile';
  for (const { variant, query } of QUERIES) {
    if (window.matchMedia(query).matches) return variant;
  }
  return 'mobile';
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return () => {};
  const lists = QUERIES.map(({ query }) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener('change', onChange));
  return () => lists.forEach((list) => list.removeEventListener('change', onChange));
}

export default function ResponsiveLeaderboard({ placement }: { placement: string }) {
  const variant = useSyncExternalStore(subscribe, pickVariant, () => 'mobile' as LeaderboardVariant);
  const creative = resolveDummyAdCreative('leaderboard', placement, variant);
  const meta = LEADERBOARD_SLOT_META[variant];

  return (
    <aside
      data-ad-placement={placement}
      aria-label="Advertisement"
      className="relative flex w-full min-w-0 max-w-full flex-col"
    >
      <span aria-hidden="true" data-ad-badge="" className="absolute right-2 top-2 z-10">
        <Badge tone="neutral" className="shadow-sm">
          Ad
        </Badge>
      </span>
      <div className="w-full">
        <div
          className="relative overflow-hidden rounded-md border border-lborder bg-secondary"
          style={{ width: '100%', aspectRatio: `${meta.width} / ${meta.height}` }}
        >
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- external placeholder creatives */}
            <img
              src={creative.src}
              alt={dummyAdAlt(creative.advertiser, creative.line)}
              width={meta.width}
              height={meta.height}
              loading="lazy"
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              className="pointer-events-none block h-full w-full select-none"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
