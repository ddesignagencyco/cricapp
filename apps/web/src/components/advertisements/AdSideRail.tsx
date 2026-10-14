'use client';

import AdSlot from './AdSlot';

export type AdSideRailProps = {
  placement?: string;
  slot?: string | null;
  className?: string;
};

/**
 * Desktop-only side-rail advertisement (requirements §8).
 *
 * - hidden below `lg` (1024px), fixed 300px column on wide screens
 * - never overlaps article content, header or navigation
 * - never creates horizontal scrolling (`max-w-full`, `min-w-0`, overflow hidden)
 * - does not narrow the main column: the parent grid owns the 300px track
 *
 * Place inside the sidebar column of a two-column layout, not on every page —
 * content-heavy article/detail pages only.
 */
export default function AdSideRail({ placement = 'layout-sidebar', slot, className = '' }: AdSideRailProps) {
  return (
    <div className={`hidden w-[300px] max-w-full shrink-0 lg:block ${className}`.trim()}>
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <AdSlot placement={placement} slot={slot} />
      </div>
    </div>
  );
}
