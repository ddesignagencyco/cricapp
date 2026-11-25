'use client';

import { usePathname } from 'next/navigation';
import AdSlot from './AdSlot';
import { useAdConfig } from './AdProvider';
import { shouldRenderAd } from '../../lib/advertisements/registry';

export type AdMultiplexProps = {
  placement?: string;
  /** Explicit AdSense ad-unit id for the dedicated Multiplex unit. */
  slot?: string | null;
  className?: string;
};

export default function AdMultiplex({ placement = 'home-multiplex', slot, className = '' }: AdMultiplexProps) {
  const config = useAdConfig();
  const pathname = usePathname() ?? '/';
  const explicit = slot?.trim() || null;

  if (!shouldRenderAd(config, placement, pathname, explicit)) return null;

  return (
    <section
      aria-label="Advertisement"
      className={`w-full min-w-0 max-w-full overflow-hidden ${className}`.trim()}
    >
      <AdSlot placement={placement} slot={slot} format="autorelaxed" />
    </section>
  );
}
