'use client';

import AdSlot, { type AdSlotProps } from './AdSlot';

export type AdBannerProps = Omit<AdSlotProps, 'format' | 'inFeed'> & {
  /** Reserved minimum height (px) to reduce layout shift. Defaults to 90. */
  minHeight?: number;
};

/**
 * Responsive display banner (requirements §4).
 *
 * Thin wrapper over `AdSlot` that pins the responsive `auto` format and keeps
 * the placement's own size default, so call sites read as intent:
 *
 * ```tsx
 * <AdBanner placement="homepage_middle" slot="1234567890" />
 * ```
 *
 * All gating (mode, route, placement toggle, slot resolution) stays inside
 * `AdSlot`. The container reserves `minHeight` px so an unfilled slot does not
 * collapse the surrounding layout before AdSense reports back.
 */
export default function AdBanner({ placement, minHeight = 90, className = '', ...rest }: AdBannerProps) {
  return (
    <div
      className="w-full min-w-0 max-w-full overflow-hidden"
      style={{ minHeight }}
    >
      <AdSlot placement={placement} format="auto" className={className} {...rest} />
    </div>
  );
}
