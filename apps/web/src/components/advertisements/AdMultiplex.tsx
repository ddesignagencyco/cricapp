'use client';

import AdSlot from './AdSlot';

export type AdMultiplexProps = {
  placement?: string;
  /** Explicit AdSense ad-unit id for the dedicated Multiplex unit. */
  slot?: string | null;
  className?: string;
};

/**
 * Multiplex (matched-content style) advertisement (requirements §5).
 *
 * Renders the official AdSense `autorelaxed` format — never a hand-built grid
 * of fake ads. Use after article content / before related articles, or at the
 * bottom of long listing pages.
 *
 * NOTE: Multiplex needs its own ad unit created in the AdSense dashboard
 * (Ads → By ad unit → Multiplex). Pass its id via `slot`, or map the
 * placement to one in site-settings once saved. Until a unit exists the slot
 * collapses to nothing in `adsense` mode by design.
 */
export default function AdMultiplex({ placement = 'home-multiplex', slot, className = '' }: AdMultiplexProps) {
  return (
    <section
      aria-label="Advertisement"
      className={`w-full min-w-0 max-w-full overflow-hidden ${className}`.trim()}
    >
      <AdSlot placement={placement} slot={slot} format="autorelaxed" />
    </section>
  );
}
