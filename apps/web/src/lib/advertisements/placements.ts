export type DummyAdSize =
  | 'leaderboard'
  | 'tablet-banner'
  | 'mobile-banner'
  | 'medium-rectangle'
  | 'large-rectangle'
  | 'half-page';

export type DummyAdCreative = {
  src: string;
  width: number;
  height: number;
  advertiser: string;
  line: string;
};

export type LeaderboardVariant = 'wide' | 'desktop' | 'tablet' | 'mobile';

type SlotMeta = {
  width: number;
  height: number;
  advertiser: string;
  line: string;
};

const SLOT_META: Record<Exclude<DummyAdSize, 'leaderboard'>, SlotMeta> = {
  'tablet-banner': {
    width: 468,
    height: 60,
    advertiser: 'PowerPlay Fitness',
    line: 'Built for Every Innings',
  },
  'mobile-banner': {
    width: 320,
    height: 100,
    advertiser: 'Stadium Mobile',
    line: 'Stay Connected to the Game',
  },
  'medium-rectangle': {
    width: 300,
    height: 250,
    advertiser: 'PitchCraft Gear',
    line: 'Match-day essentials',
  },
  'large-rectangle': {
    width: 336,
    height: 280,
    advertiser: 'NightWatch Optics',
    line: 'See every delivery',
  },
  'half-page': {
    width: 300,
    height: 600,
    advertiser: 'TourKit Luggage',
    line: 'Pack for the away series',
  },
};

export const LEADERBOARD_SLOT_META: Record<LeaderboardVariant, SlotMeta> = {
  wide: {
    width: 970,
    height: 90,
    advertiser: 'Boundary Sports',
    line: 'Train Your Game',
  },
  desktop: {
    width: 728,
    height: 90,
    advertiser: 'GreenLine Travel',
    line: 'Follow the Tour',
  },
  tablet: {
    width: 468,
    height: 60,
    advertiser: 'PowerPlay Fitness',
    line: 'Built for Every Innings',
  },
  mobile: {
    width: 320,
    height: 100,
    advertiser: 'Stadium Mobile',
    line: 'Stay Connected to the Game',
  },
};

/** Stable per placement + size — different slots get different photos, same slot stays consistent. */
export function dummyAdPlaceholderUrl(width: number, height: number, seed: string): string {
  const safe = seed.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 96);
  return `https://picsum.photos/seed/${encodeURIComponent(safe)}/${width}/${height}`;
}

function seedFor(placement: string, size: DummyAdSize, variant?: LeaderboardVariant): string {
  return variant ? `${placement}--${size}--${variant}` : `${placement}--${size}`;
}

export function resolveDummyAdCreative(
  size: DummyAdSize,
  placement: string,
  variant?: LeaderboardVariant
): DummyAdCreative {
  if (size === 'leaderboard') {
    const v = variant ?? 'desktop';
    const meta = LEADERBOARD_SLOT_META[v];
    return {
      ...meta,
      src: dummyAdPlaceholderUrl(meta.width, meta.height, seedFor(placement, size, v)),
    };
  }

  const meta = SLOT_META[size];
  return {
    ...meta,
    src: dummyAdPlaceholderUrl(meta.width, meta.height, seedFor(placement, size)),
  };
}

/** @deprecated Use resolveDummyAdCreative(placement) — kept for scripts/tests */
export const DUMMY_AD_CREATIVES: Record<Exclude<DummyAdSize, 'leaderboard'>, DummyAdCreative> = {
  'tablet-banner': resolveDummyAdCreative('tablet-banner', 'default-tablet'),
  'mobile-banner': resolveDummyAdCreative('mobile-banner', 'default-mobile'),
  'medium-rectangle': resolveDummyAdCreative('medium-rectangle', 'default-medium'),
  'large-rectangle': resolveDummyAdCreative('large-rectangle', 'default-large'),
  'half-page': resolveDummyAdCreative('half-page', 'default-half'),
};

/** @deprecated Use resolveDummyAdCreative with variant */
export const RESPONSIVE_LEADERBOARD = {
  wide: resolveDummyAdCreative('leaderboard', 'default-leaderboard', 'wide'),
  desktop: resolveDummyAdCreative('leaderboard', 'default-leaderboard', 'desktop'),
  tablet: resolveDummyAdCreative('leaderboard', 'default-leaderboard', 'tablet'),
  mobile: resolveDummyAdCreative('leaderboard', 'default-leaderboard', 'mobile'),
} as const;

const AUTH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/signin',
  '/signup',
];

/** Paths that never render dummy advertisements. */
export function shouldHideDummyAds(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return true;
  if (pathname === '/404' || pathname === '/_not-found') return true;
  if (
    pathname.startsWith('/editorial/') ||
    pathname === '/about' ||
    pathname === '/privacy' ||
    pathname === '/terms'
  ) {
    return true;
  }
  return AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function dummyAdAlt(advertiser: string, line: string): string {
  return `Advertisement for ${advertiser}: ${line}`;
}
