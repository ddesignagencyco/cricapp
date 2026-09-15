import type { ReactNode } from 'react';
import {
  DUMMY_AD_CREATIVES,
  RESPONSIVE_LEADERBOARD,
  dummyAdAlt,
  type DummyAdSize,
} from '../../lib/advertisements/placements';

export type DummyAdProps = {
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

function mediaKind(src: string): 'video' | 'image' {
  return /\.(mp4|webm|ogg)$/i.test(src) ? 'video' : 'image';
}

function CreativeMedia({
  src,
  width,
  height,
  alt,
  className = '',
}: {
  src: string;
  width: number;
  height: number;
  alt: string;
  className?: string;
}) {
  const frame = `pointer-events-none block select-none ${className}`.trim();
  const fit = {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    objectPosition: 'center',
  };

  if (mediaKind(src) === 'video') {
    return (
      <video
        src={src}
        width={width}
        height={height}
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        controls={false}
        aria-label={alt}
        className={frame}
        style={fit}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local dummy creative (png/gif/webp)
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={frame}
      style={fit}
    />
  );
}

function SlotFrame({
  width,
  height,
  children,
  fill = false,
}: {
  width: number;
  height: number;
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-md border border-lborder bg-card"
      style={{
        width: '100%',
        maxWidth: fill ? '100%' : width,
        aspectRatio: `${width} / ${height}`,
      }}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

function ResponsiveLeaderboard({ placement }: { placement: string }) {
  const { wide, desktop, tablet, mobile } = RESPONSIVE_LEADERBOARD;

  return (
    <aside
      data-ad-placement={placement}
      aria-label="Advertisement"
      className="w-full min-w-0 max-w-full"
    >
      <div className="w-full">
        <div className="hidden w-full min-[1200px]:block">
          <SlotFrame width={wide.width} height={wide.height} fill>
            <CreativeMedia src={wide.src} width={wide.width} height={wide.height} alt={dummyAdAlt(wide.advertiser, wide.line)} />
          </SlotFrame>
        </div>
        <div className="hidden w-full min-[800px]:max-[1199px]:block">
          <SlotFrame width={desktop.width} height={desktop.height} fill>
            <CreativeMedia src={desktop.src} width={desktop.width} height={desktop.height} alt={dummyAdAlt(desktop.advertiser, desktop.line)} />
          </SlotFrame>
        </div>
        <div className="hidden w-full min-[500px]:max-[799px]:block">
          <SlotFrame width={tablet.width} height={tablet.height} fill>
            <CreativeMedia src={tablet.src} width={tablet.width} height={tablet.height} alt={dummyAdAlt(tablet.advertiser, tablet.line)} />
          </SlotFrame>
        </div>
        <div className="block w-full min-[500px]:hidden">
          <SlotFrame width={mobile.width} height={mobile.height} fill>
            <CreativeMedia src={mobile.src} width={mobile.width} height={mobile.height} alt={dummyAdAlt(mobile.advertiser, mobile.line)} />
          </SlotFrame>
        </div>
      </div>
    </aside>
  );
}

export default function DummyAd({ size, placement, className = '', inFeed = false }: DummyAdProps) {
  if (size === 'leaderboard' && !inFeed) {
    return (
      <div className={`w-full min-w-0 max-w-full ${className}`.trim()}>
        <ResponsiveLeaderboard placement={placement} />
      </div>
    );
  }

  const creative = size === 'leaderboard' ? RESPONSIVE_LEADERBOARD.desktop : DUMMY_AD_CREATIVES[size];
  const alt = dummyAdAlt(creative.advertiser, creative.line);
  const hideOnMobile = size === 'half-page';

  if (inFeed) {
    return (
      <aside
        data-ad-placement={placement}
        aria-label="Advertisement"
        className={`flex h-full min-h-[148px] flex-col overflow-hidden rounded-md border border-lborder bg-card ${className}`.trim()}
      >
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
      className={`mx-auto w-full min-w-0 max-w-full overflow-hidden ${hideOnMobile ? 'hidden lg:block' : ''} ${className}`.trim()}
      style={{ maxWidth: creative.width }}
    >
      <SlotFrame width={creative.width} height={creative.height}>
        <CreativeMedia src={creative.src} width={creative.width} height={creative.height} alt={alt} />
      </SlotFrame>
    </aside>
  );
}

export type { DummyAdSize };
