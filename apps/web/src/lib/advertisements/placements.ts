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

export const DUMMY_AD_CREATIVES: Record<Exclude<DummyAdSize, 'leaderboard'>, DummyAdCreative> = {
  'tablet-banner': {
    src: '/advertisements/tablet-468x60.png',
    width: 468,
    height: 60,
    advertiser: 'PowerPlay Fitness',
    line: 'Built for Every Innings',
  },
  'mobile-banner': {
    src: '/advertisements/mobile-320x100.png',
    width: 320,
    height: 100,
    advertiser: 'Stadium Mobile',
    line: 'Stay Connected to the Game',
  },
  'medium-rectangle': {
    src: '/advertisements/rectangle-300x250.png',
    width: 300,
    height: 250,
    advertiser: 'PitchCraft Gear',
    line: 'Match-day essentials',
  },
  'large-rectangle': {
    src: '/advertisements/large-rectangle-336x280.png',
    width: 336,
    height: 280,
    advertiser: 'NightWatch Optics',
    line: 'See every delivery',
  },
  'half-page': {
    src: '/advertisements/half-page-300x600.png',
    width: 300,
    height: 600,
    advertiser: 'TourKit Luggage',
    line: 'Pack for the away series',
  },
};

export const RESPONSIVE_LEADERBOARD = {
  wide: {
    src: '/advertisements/leaderboard-970x90.png',
    width: 970,
    height: 90,
    minWidth: 1200,
    advertiser: 'Boundary Sports',
    line: 'Train Your Game',
  },
  desktop: {
    src: '/advertisements/leaderboard-728x90.png',
    width: 728,
    height: 90,
    minWidth: 800,
    advertiser: 'GreenLine Travel',
    line: 'Follow the Tour',
  },
  tablet: {
    src: '/advertisements/tablet-468x60.png',
    width: 468,
    height: 60,
    minWidth: 500,
    advertiser: 'PowerPlay Fitness',
    line: 'Built for Every Innings',
  },
  mobile: {
    src: '/advertisements/mobile-320x100.png',
    width: 320,
    height: 100,
    advertiser: 'Stadium Mobile',
    line: 'Stay Connected to the Game',
  },
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
