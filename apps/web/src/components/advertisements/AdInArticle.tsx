'use client';

import { usePathname } from 'next/navigation';
import AdSlot from './AdSlot';
import { useAdConfig } from './AdProvider';
import { shouldRenderAd } from '../../lib/advertisements/registry';

export type AdInArticleProps = {
  placement?: string;
  /** Explicit AdSense ad-unit id for a dedicated in-article unit. */
  slot?: string | null;
  className?: string;
};

export default function AdInArticle({ placement = 'news-detail-inarticle', slot, className = '' }: AdInArticleProps) {
  const config = useAdConfig();
  const pathname = usePathname() ?? '/';
  const explicit = slot?.trim() || null;

  if (!shouldRenderAd(config, placement, pathname, explicit)) return null;

  return (
    <div className={`my-8 flex w-full min-w-0 max-w-full justify-center overflow-hidden ${className}`.trim()}>
      <AdSlot placement={placement} slot={slot} format="fluid" className="w-full" />
    </div>
  );
}
