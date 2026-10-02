import { TOOLS, TOOL_GROUPS, toolBySlug, toolSource, TOOL_SOURCE_LABEL, type ToolKind } from '../lib/toolsCatalog';
import {
  dummyAdPlaceholderUrl,
  resolveDummyAdCreative,
  shouldHideDummyAds,
  dummyAdAlt,
  LEADERBOARD_SLOT_META,
  DUMMY_AD_CREATIVES,
  RESPONSIVE_LEADERBOARD,
  type DummyAdSize,
  type LeaderboardVariant,
} from '../lib/advertisements/placements';

describe('toolsCatalog', () => {
  it('has a unique slug for every tool', () => {
    const slugs = TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every tool a title and a blurb so no card renders blank', () => {
    TOOLS.forEach((tool) => {
      expect(tool.title.trim().length).toBeGreaterThan(0);
      expect(tool.blurb.trim().length).toBeGreaterThan(0);
    });
  });

  it('uses url-safe lowercase slugs so /tools/[slug] resolves', () => {
    TOOLS.forEach((tool) => expect(tool.slug).toMatch(/^[a-z0-9-]+$/));
  });

  it('assigns every tool to a group that actually exists', () => {
    const groups = new Set(TOOL_GROUPS.map((g) => g.key));
    TOOLS.forEach((tool) => expect(groups.has(tool.group)).toBe(true));
  });

  it('leaves no declared group empty', () => {
    const used = new Set(TOOLS.map((t) => t.group));
    TOOL_GROUPS.forEach((group) => expect(used.has(group.key)).toBe(true));
  });

  it('looks a tool up by slug', () => {
    expect(toolBySlug('dls')?.kind).toBe('dls');
    expect(toolBySlug('head-to-head')?.kind).toBe('h2h');
  });

  it('returns undefined for an unknown slug', () => {
    expect(toolBySlug('does-not-exist')).toBeUndefined();
  });

  it('classifies every tool kind into a source bucket', () => {
    // toolSource is exhaustive and throws on a kind it does not know, so
    // calling it for every catalog entry is the regression guard.
    TOOLS.forEach((tool) => expect(toolSource(tool.kind)).toMatch(/formula|stored|api/));
  });

  it('marks the offline calculators as formula backed', () => {
    expect(toolSource('nrr')).toBe('formula');
    expect(toolSource('dls')).toBe('formula');
    expect(toolSource('what-if')).toBe('formula');
    expect(toolSource('fantasy')).toBe('formula');
  });

  it('marks the directory tools as stored', () => {
    expect(toolSource('player-compare')).toBe('stored');
    expect(toolSource('h2h')).toBe('stored');
  });

  it('marks the odds tools as api backed', () => {
    expect(toolSource('odds')).toBe('api');
    expect(toolSource('implied')).toBe('api');
    expect(toolSource('odds-match')).toBe('api');
  });

  it('has a human label for every source bucket', () => {
    const buckets: ToolKind[] = ['nrr', 'player-compare', 'odds'];
    buckets.forEach((kind) => expect(TOOL_SOURCE_LABEL[toolSource(kind)].length).toBeGreaterThan(0));
  });
});

describe('ad placements', () => {
  it('builds a picsum url carrying the requested dimensions', () => {
    expect(dummyAdPlaceholderUrl(300, 250, 'home--medium-rectangle')).toBe(
      'https://picsum.photos/seed/home--medium-rectangle/300/250',
    );
  });

  it('sanitises a seed that would break the url path', () => {
    const url = dummyAdPlaceholderUrl(10, 10, 'a b/../c?d=1');
    expect(url).not.toContain(' ');
    expect(url).not.toContain('?');
    expect(url).not.toContain('..');
  });

  it('caps a very long seed so the url stays sane', () => {
    const url = dummyAdPlaceholderUrl(10, 10, 'x'.repeat(400));
    expect(url).toBe(`https://picsum.photos/seed/${'x'.repeat(96)}/10/10`);
  });

  it('resolves a fixed size slot to its declared dimensions', () => {
    const creative = resolveDummyAdCreative('medium-rectangle', 'home-leader');
    expect(creative).toMatchObject({ width: 300, height: 250, advertiser: 'PitchCraft Gear' });
  });

  it('resolves each leaderboard variant to its own dimensions', () => {
    const wide = resolveDummyAdCreative('leaderboard', 'home', 'wide');
    const mobile = resolveDummyAdCreative('leaderboard', 'home', 'mobile');
    expect(wide).toMatchObject({ width: 970, height: 90 });
    expect(mobile).toMatchObject({ width: 320, height: 100 });
  });

  it('defaults an unvariant leaderboard to desktop', () => {
    expect(resolveDummyAdCreative('leaderboard', 'home').width).toBe(LEADERBOARD_SLOT_META.desktop.width);
  });

  it('gives different placements different images for the same size', () => {
    const a = resolveDummyAdCreative('medium-rectangle', 'home-leader');
    const b = resolveDummyAdCreative('medium-rectangle', 'sidebar');
    expect(a.src).not.toBe(b.src);
  });

  it('is stable for the same placement and size so the ad does not flicker', () => {
    expect(resolveDummyAdCreative('medium-rectangle', 'home-leader').src).toBe(
      resolveDummyAdCreative('medium-rectangle', 'home-leader').src,
    );
  });

  it('pre-sizes the deprecated maps too, for the scripts that still read them', () => {
    (Object.keys(DUMMY_AD_CREATIVES) as Array<keyof typeof DUMMY_AD_CREATIVES>).forEach((key) => {
      const creative = DUMMY_AD_CREATIVES[key];
      expect(creative.src).toContain(`/${creative.width}/${creative.height}`);
    });
    expect(RESPONSIVE_LEADERBOARD.wide.width).toBe(970);
    expect(RESPONSIVE_LEADERBOARD.mobile.width).toBe(320);
  });
});

describe('shouldHideDummyAds', () => {
  it('hides ads across the whole admin section', () => {
    expect(shouldHideDummyAds('/admin')).toBe(true);
    expect(shouldHideDummyAds('/admin/news')).toBe(true);
  });

  it('hides ads on the not-found routes', () => {
    expect(shouldHideDummyAds('/404')).toBe(true);
    expect(shouldHideDummyAds('/_not-found')).toBe(true);
  });

  it('hides ads on legal and editorial pages', () => {
    expect(shouldHideDummyAds('/about')).toBe(true);
    expect(shouldHideDummyAds('/privacy')).toBe(true);
    expect(shouldHideDummyAds('/terms')).toBe(true);
    expect(shouldHideDummyAds('/editorial/about')).toBe(true);
  });

  it('hides ads on every auth route and its sub-paths', () => {
    ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/signin', '/signup'].forEach(
      (path) => expect(shouldHideDummyAds(path)).toBe(true),
    );
    expect(shouldHideDummyAds('/login/extra')).toBe(true);
  });

  it('shows ads on the content pages', () => {
    ['/', '/matches', '/news', '/psl', '/gallery', '/streams'].forEach((path) => {
      expect(shouldHideDummyAds(path)).toBe(false);
    });
  });

  it('does not hide a path that merely starts with a hidden word', () => {
    // The auth prefixes and /editorial/ all anchor on a slash or an exact
    // match, so these stay visible.
    expect(shouldHideDummyAds('/register-now')).toBe(false);
    expect(shouldHideDummyAds('/about-us')).toBe(false);
    expect(shouldHideDummyAds('/editorial')).toBe(false);
  });

  it('currently also hides any path beginning with "/admin"', () => {
    // Known over-broad prefix: `startsWith('/admin')` has no trailing slash, so
    // a future route like /administrators-guide would silently lose its ads.
    // No such route exists today, so this documents the behaviour rather than
    // asserting a fix. Compare with the '/editorial/' check, which is anchored.
    expect(shouldHideDummyAds('/administrators-guide')).toBe(true);
  });
});

describe('dummyAdAlt', () => {
  it('labels the creative for screen readers', () => {
    expect(dummyAdAlt('PitchCraft Gear', 'Match-day essentials')).toBe(
      'Advertisement for PitchCraft Gear: Match-day essentials',
    );
  });
});

describe('ad size types', () => {
  it('covers every fixed size in the resolution helper', () => {
    const sizes: DummyAdSize[] = [
      'tablet-banner',
      'mobile-banner',
      'medium-rectangle',
      'large-rectangle',
      'half-page',
    ];
    sizes.forEach((size) => expect(resolveDummyAdCreative(size, 'x').width).toBeGreaterThan(0));
  });

  it('covers every leaderboard variant', () => {
    (['wide', 'desktop', 'tablet', 'mobile'] as LeaderboardVariant[]).forEach((variant) => {
      expect(resolveDummyAdCreative('leaderboard', 'x', variant).src).toContain(variant);
    });
  });
});
