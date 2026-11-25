'use client';

import { usePathname } from 'next/navigation';
import AdSlot from './AdSlot';
import { useAdConfig } from './AdProvider';
import { shouldRenderAd } from '../../lib/advertisements/registry';

export type AdSideRailProps = {
  placement?: string;
  slot?: string | null;
  className?: string;
};

export default function AdSideRail({ placement = 'layout-sidebar', slot, className = '' }: AdSideRailProps) {
  const config = useAdConfig();
  const pathname = usePathname() ?? '/';
  const explicit = slot?.trim() || null;

  if (!shouldRenderAd(config, placement, pathname, explicit)) return null;

  return (
    <div className={`hidden w-[300px] max-w-full shrink-0 lg:block ${className}`.trim()}>
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <AdSlot placement={placement} slot={slot} />
      </div>
    </div>
  );
}
