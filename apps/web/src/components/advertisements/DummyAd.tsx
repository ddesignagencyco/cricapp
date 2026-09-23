import type { ReactNode } from 'react';
import {
  LEADERBOARD_SLOT_META,
  dummyAdAlt,
  resolveDummyAdCreative,
  type DummyAdSize,
  type LeaderboardVariant,
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
  const frame = `pointer-events-none block h-full w-full select-none ${className}`.trim();
  const fit = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
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
    // eslint-disable-next-line @next/next/no-img-element -- external placeholder creatives
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
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
      className="relative overflow-hidden rounded-md border border-lborder bg-secondary"
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

const LEADERBOARD_BREAKPOINTS: { variant: LeaderboardVariant; className: string }[] = [
  { variant: 'wide', className: 'hidden w-full min-[1200px]:block' },
  { variant: 'desktop', className: 'hidden w-full min-[800px]:max-[1199px]:block' },
  { variant: 'tablet', className: 'hidden w-full min-[500px]:max-[799px]:block' },
  { variant: 'mobile', className: 'block w-full min-[500px]:hidden' },
];

function ResponsiveLeaderboard({ placement }: { placement: string }) {
  return (
    <aside
      data-ad-placement={placement}
      aria-label="Advertisement"
      className="w-full min-w-0 max-w-full"
    >
      <div className="w-full">
        {LEADERBOARD_BREAKPOINTS.map(({ variant, className }) => {
          const creative = resolveDummyAdCreative('leaderboard', placement, variant);
          const meta = LEADERBOARD_SLOT_META[variant];
          return (
            <div key={variant} className={className}>
              <SlotFrame width={meta.width} height={meta.height} fill>
                <CreativeMedia
                  src={creative.src}
                  width={meta.width}
                  height={meta.height}
                  alt={dummyAdAlt(creative.advertiser, creative.line)}
                />
              </SlotFrame>
            </div>
          );
        })}
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

  const creative = resolveDummyAdCreative(size, placement, size === 'leaderboard' ? 'desktop' : undefined);
  const alt = dummyAdAlt(creative.advertiser, creative.line);
  const hideOnMobile = size === 'half-page';

  if (inFeed) {
    return (
      <aside
        data-ad-placement={placement}
        aria-label="Advertisement"
        className={`flex h-full min-h-[148px] flex-col overflow-hidden rounded-md border border-lborder bg-secondary ${className}`.trim()}
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
