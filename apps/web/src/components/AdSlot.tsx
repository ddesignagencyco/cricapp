'use client';

import { useState } from 'react';

/**
 * Reserved space for sponsored content.
 *
 * No ad provider is wired up yet, so this shows a placeholder creative at the
 * slot's exact dimensions rather than invented advertiser copy. Each format
 * reserves a fixed height so swapping in a real creative later does not shift
 * the layout, and `data-ad-slot` gives an ad script a stable hook per position.
 */

export type AdFormat = 'leaderboard' | 'inline' | 'rectangle';

const formatSpecs: Record<AdFormat, { width: number; height: number; box: string }> = {
  leaderboard: { width: 728, height: 90, box: 'h-[100px] sm:h-[90px]' },
  inline: { width: 468, height: 120, box: 'h-[140px] sm:h-[120px]' },
  rectangle: { width: 300, height: 250, box: 'h-[250px]' },
};

interface AdSlotProps {
  /** Stable identifier for the position, e.g. `news-detail-mid`. */
  slot: string;
  format?: AdFormat;
  className?: string;
}

export default function AdSlot({ slot, format = 'leaderboard', className = '' }: AdSlotProps) {
  const { width, height, box } = formatSpecs[format];
  const [imageFailed, setImageFailed] = useState(false);

  // Seeded by the slot id so each position gets its own image and the server and
  // client render the same URL. A per-load random URL would mismatch on hydration.
  const placeholderSrc = `https://picsum.photos/seed/${encodeURIComponent(slot)}/${width}/${height}`;

  return (
    <aside data-ad-slot={slot} aria-label="Sponsored content" className={`w-full ${className}`}>
      {/* Capped at the creative width so the unit hugs the image instead of
          leaving empty gutters in a wider column. */}
      <div className="mx-auto w-full" style={{ maxWidth: width }}>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-stext">Sponsored</p>
        <div
          className={`relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed border-lborder bg-card ${box}`}
        >
          {imageFailed ? (
            <>
              <span className="text-xs font-medium text-stext">Ad space available</span>
              <span className="font-mono text-xs text-stext/70">{width} × {height}</span>
            </>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- placeholder creative, not app content */}
              <img
                src={placeholderSrc}
                alt=""
                width={width}
                height={height}
                loading="lazy"
                onError={() => setImageFailed(true)}
                className="h-full w-auto max-w-full object-contain"
              />
              <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                {width} × {height} placeholder
              </span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
