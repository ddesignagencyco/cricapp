'use client';

import { usePathname } from 'next/navigation';
import AdSlot, { type AdSlotProps } from './AdSlot';
import { useAdConfig } from './AdProvider';
import { shouldRenderAd } from '../../lib/advertisements/registry';

export type AdBannerProps = Omit<AdSlotProps, 'format' | 'inFeed'> & {
  /** Reserved minimum height (px) to reduce layout shift. Defaults to 90. */
  minHeight?: number;
};

export default function AdBanner({ placement, minHeight = 90, className = '', slot, ...rest }: AdBannerProps) {
  const config = useAdConfig();
  const pathname = usePathname() ?? '/';
  const explicit = slot?.trim() || null;

  if (!shouldRenderAd(config, placement, pathname, explicit)) return null;

  return (
    <div
      className="w-full min-w-0 max-w-full overflow-hidden"
      style={{ minHeight }}
    >
      <AdSlot placement={placement} slot={slot} format="auto" className={className} {...rest} />
    </div>
  );
}
