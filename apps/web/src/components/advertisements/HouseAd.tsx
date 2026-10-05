import type { ReactNode } from 'react';
import Badge from '../Badge';
import ResponsiveLeaderboard from './ResponsiveLeaderboard';
import {
  dummyAdAlt,
  resolveDummyAdCreative,
  type DummyAdSize,
} from '../../lib/advertisements/placements';

export type HouseAdProps = {
  size:
    | 'leaderboard'
    | 'tablet-banner'
    | 'mobile-banner'
    | 'medium-rectangle'
    | 'large-rectangle'
    | 'half-page';
  placement: string;
  className?: string;
  inFeed?: boolean;
};

/**
 * The `house` mode creative: a placeholder image standing in for a paid slot.
 *
 * This is the markup the site has always rendered. `AdSlot` decides *whether* it
 * appears at all — mode, placement toggle, route gate and slot id — so this
 * component stays a pure presentational leaf with no knowledge of the ad config.
 */
function AdBadge() {
  return (
    <span aria-hidden="true" data-ad-badge="" className="absolute right-2 top-2 z-10">
      <Badge tone="neutral" className="shadow-sm">
        Ad
      </Badge>
    </span>
  );
}

function mediaKind(src: string): 'video' | 'image' {
  return /\.(mp4|webm|ogg)$/i.test(src) ? 'video' : 'image';
}

function CreativeMedia({ src, width, height, alt, className = '' }: {
  src: string; width: number; height: number; alt: string; className?: string;
}) {
  const frame = `pointer-events-none block h-full w-full select-none ${className}`.trim();
  const fit = {
    width: '100%', height: '100%', objectFit: 'cover' as const, objectPosition: 'center',
  };

  if (mediaKind(src) === 'video') {
    return (
      <video src={src} width={width} height={height} autoPlay muted loop playsInline
             disablePictureInPicture controls={false} aria-label={alt}
             className={frame} style={fit} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external placeholder creatives
    <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async"
         draggable={false} referrerPolicy="no-referrer" className={frame} style={fit} />
  );
}

function SlotFrame({ width, height, children, fill = false }: {
  width: number; height: number; children: ReactNode; fill?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-md border border-lborder bg-secondary"
      style={{ width: '100%', maxWidth: fill ? '100%' : width, aspectRatio: `${width} / ${height}` }}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

export default function HouseAd({ size, placement, className = '', inFeed = false }: HouseAdProps) {
  if (size === 'leaderboard' && !inFeed) {
    return (
      <div className={`w-full min-w-0 max-w-full ${className}`.trim()}>
        <ResponsiveLeaderboard placement={placement} />
      </div>
    );
  }
  const creative = resolveDummyAdCreative(size, placement, size === 'leaderboard' ? 'desktop' : undefined);
  const alt = dummyAdAlt(creative.advertiser, creative.line);
  const hideOnMobile = size === 'half-page';

  if (inFeed) {
    return (
      <aside
        data-ad-placement={placement}
        aria-label="Advertisement"
        className={`relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-md border border-lborder bg-secondary ${className}`.trim()}
      >
        <AdBadge />
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <CreativeMedia src={creative.src} width={creative.width} height={creative.height} alt={alt} />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-ad-placement={placement}
      aria-label="Advertisement"
      className={`relative mx-auto flex w-full min-w-0 max-w-full flex-col ${hideOnMobile ? 'hidden lg:flex' : ''} ${className}`.trim()}
      style={{ maxWidth: creative.width }}
    >
      <AdBadge />
      <SlotFrame width={creative.width} height={creative.height}>
        <CreativeMedia src={creative.src} width={creative.width} height={creative.height} alt={alt} />
      </SlotFrame>
    </aside>
  );
}

export type { DummyAdSize };