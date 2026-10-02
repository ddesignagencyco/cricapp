import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  AD_MODES,
  AD_PLACEMENTS,
  AD_PLACEMENT_GROUPS,
  AD_SIZES,
  EMPTY_AD_CONFIG,
  UNREGISTERED_GROUP,
  adPlacement,
  adPlacementEnabled,
  adPlacementGroup,
  adPlacementSize,
  groupAdPlacementRows,
  isGamblingRoute,
  isValidAdUnitId,
  isValidPublisherId,
  resolveAdSlotId,
  shouldRenderAd,
  type AdConfig,
} from '../lib/advertisements/registry';

/** The API drops any stored key that does not match this. Mirrors ad.config.ts. */
const API_PLACEMENT_KEY_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function configWith(overrides: Partial<AdConfig> = {}): AdConfig {
  return { ...EMPTY_AD_CONFIG, ...overrides };
}

describe('the placement registry', () => {
  it('uses only keys the API will actually store', () => {
    // The API normalises placements by dropping any key that fails
    // AD_PLACEMENT_KEY_RE, so an invalid key here is a silent no-op in production.
    AD_PLACEMENTS.forEach((placement) => {
      expect(placement.key).toMatch(API_PLACEMENT_KEY_RE);
    });
  });

  it('has no duplicate keys', () => {
    const keys = AD_PLACEMENTS.map((placement) => placement.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every placement a real size, a label and a lookup entry', () => {
    AD_PLACEMENTS.forEach((placement) => {
      expect(AD_SIZES).toContain(placement.size);
      expect(placement.label.trim().length).toBeGreaterThan(0);
      expect(adPlacement(placement.key)).toBe(placement);
    });
  });

  it('looks a placement up by key and falls back safely for an unknown one', () => {
    expect(adPlacement('home-mid')?.size).toBe('leaderboard');
    expect(adPlacement('no-such-placement')).toBeUndefined();
    expect(adPlacementSize('no-such-placement')).toBe('leaderboard');
  });

  it('stores the global top banner under a single persistable key', () => {
    // The call site used to render `global-top:{pathname}`, which cannot be stored:
    // the API key regex allows no colon, slash or dot.
    const globalTop = adPlacement('global-top');
    expect(globalTop).toBeDefined();
    expect(globalTop?.perRoute).toBe(true);
    expect(globalTop?.key).not.toContain(':');
  });

  it('covers every placement key used at a call site', () => {
    // Guards the migration: a typo in `placement="..."` would otherwise render a slot
    // the admin screen never offers a row for, so the config could not be edited.
    const srcRoot = join(__dirname, '..');
    const keys = new Set(AD_PLACEMENTS.map((placement) => placement.key));
    const used = new Set<string>();

    const walk = (dir: string) => {
      readdirSync(dir).forEach((entry) => {
        // Test fixtures use their own placement names, so only production code counts.
        if (entry === 'tests' || entry === 'test') return;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          return;
        }
        if (!/\.tsx?$/.test(entry)) return;
        const source = readFileSync(full, 'utf8');
        for (const match of source.matchAll(/placement="([a-z0-9-]+)"/g)) used.add(match[1]);
      });
    };

    walk(srcRoot);

    expect(used.size).toBeGreaterThan(0);
    [...used].forEach((key) => expect(keys.has(key)).toBe(true));
  });
});

describe('placement grouping', () => {
  it('puts every placement in a declared group', () => {
    // A typo in `group` would silently dump the row into the "not in the registry"
    // bucket, where it reads as dead config and cannot be found by page.
    const ids = new Set<string>(AD_PLACEMENT_GROUPS.map((group) => group.id));
    AD_PLACEMENTS.forEach((placement) => {
      expect(ids.has(placement.group)).toBe(true);
    });
  });

  it('has no duplicate group ids', () => {
    const ids = AD_PLACEMENT_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('buckets rows in declaration order and drops empty groups', () => {
    const groups = groupAdPlacementRows([
      { key: 'home-mid', group: 'home' },
      { key: 'global-top', group: 'site' },
      { key: 'news-list-bottom', group: 'news' },
    ]);
    expect(groups.map((group) => group.id)).toEqual(['site', 'home', 'news']);
  });

  it('keeps every placement exactly once', () => {
    const groups = groupAdPlacementRows(AD_PLACEMENTS);
    expect(groups.flatMap((group) => group.rows.map((row) => row.key)).sort()).toEqual(
      AD_PLACEMENTS.map((placement) => placement.key).sort(),
    );
  });

  it('splits the 26 placements into a handful of page groups', () => {
    // The admin screen shows one switch cluster per group. A single group holding
    // every row would put the overload straight back.
    const groups = groupAdPlacementRows(AD_PLACEMENTS);
    expect(groups.length).toBeGreaterThan(2);
    groups.forEach((group) => expect(group.rows.length).toBeLessThan(AD_PLACEMENTS.length / 2));
  });

  it('parks an unknown or missing group last, as config debt', () => {
    const groups = groupAdPlacementRows([
      { key: 'home-mid', group: 'home' },
      { key: 'legacy-slot', group: 'some-removed-group' },
      { key: 'no-group-at-all' },
    ]);
    expect(groups.map((group) => group.id)).toEqual(['home', UNREGISTERED_GROUP.id]);
    expect(groups[1].rows.map((row) => row.key)).toEqual(['legacy-slot', 'no-group-at-all']);
  });

  it('falls back to the unregistered bucket for an unknown id', () => {
    expect(adPlacementGroup('nope')).toEqual(UNREGISTERED_GROUP);
    expect(adPlacementGroup('home')).toEqual({ id: 'home', label: 'Home page', hint: '/' });
  });
});

describe('slot id resolution', () => {
  const config = configWith({
    mode: 'adsense',
    defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111', 'medium-rectangle': '2222222222' },
    placements: { 'home-sidebar': { enabled: true, slotId: '3333333333' } },
  });

  it('prefers the placement slot id over the size default', () => {
    expect(resolveAdSlotId('home-sidebar', 'medium-rectangle', config)).toBe('3333333333');
  });

  it('falls back to the size default when the placement has none', () => {
    expect(resolveAdSlotId('news-list-bottom', 'leaderboard', config)).toBe('1111111111');
    expect(resolveAdSlotId('news-detail-sidebar', 'medium-rectangle', config)).toBe('2222222222');
  });

  it('returns null when neither source has an id', () => {
    expect(resolveAdSlotId('psl-half-page', 'half-page', config)).toBeNull();
  });
});

describe('placement enabled flag', () => {
  it('treats an absent placement as enabled, matching the API default', () => {
    // The API normalises `enabled` to `rawValue.enabled !== false`, so a placement
    // missing from the map is on.
    expect(adPlacementEnabled('never-configured', EMPTY_AD_CONFIG)).toBe(true);
  });

  it('honours an explicit false', () => {
    const config = configWith({ placements: { 'layout-sidebar': { enabled: false, slotId: null } } });
    expect(adPlacementEnabled('layout-sidebar', config)).toBe(false);
  });
});

describe('gambling route gate', () => {
  it('covers the betting-adjacent routes and their sub-paths', () => {
    ['/odds', '/odds/', '/odds/123', '/predictions', '/predictions/abc'].forEach((path) => {
      expect(isGamblingRoute(path)).toBe(true);
    });
  });

  it('does not over-match a path that merely starts with the same letters', () => {
    expect(isGamblingRoute('/oddsomething')).toBe(false);
    expect(isGamblingRoute('/predictions-archive')).toBe(false);
  });

  it('leaves ordinary content routes alone', () => {
    ['/', '/news', '/matches', '/psl', '/tournaments/7'].forEach((path) => {
      expect(isGamblingRoute(path)).toBe(false);
    });
  });
});

describe('shouldRenderAd', () => {
  it('renders nothing at all in off mode', () => {
    const config = configWith({
      mode: 'off',
      defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111' },
    });
    ['/news', '/', '/odds'].forEach((path) => {
      expect(shouldRenderAd(config, 'home-mid', path)).toBe(false);
    });
  });

  it('renders the placeholder in house mode even with no slot id configured', () => {
    expect(shouldRenderAd(configWith({ mode: 'house' }), 'psl-half-page', '/psl')).toBe(true);
  });

  it('renders nothing in adsense mode when no slot id resolves', () => {
    // A null slotId would otherwise produce a visible empty box.
    expect(shouldRenderAd(configWith({ mode: 'adsense' }), 'home-mid', '/')).toBe(false);
    expect(shouldRenderAd(configWith({ mode: 'adsense' }), 'home-mid', '/')).toBe(false);
  });

  it('renders in adsense mode once a slot id resolves', () => {
    const config = configWith({
      mode: 'adsense',
      clientId: 'pub-1234567890123456',
      defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111' },
    });
    expect(shouldRenderAd(config, 'home-mid', '/')).toBe(true);
  });

  it('blocks a shared placement on a gambling route unless the admin opted in', () => {
    // Gating only the prediction-detail placements would not be enough: the sidebar
    // and the global top banner render on these pages too.
    const config = configWith({
      mode: 'house',
      placements: { 'layout-sidebar': { enabled: true, slotId: null } },
    });
    expect(shouldRenderAd(config, 'layout-sidebar', '/odds')).toBe(false);
    expect(shouldRenderAd(config, 'global-top', '/predictions/match-1')).toBe(false);
    expect(shouldRenderAd(config, 'layout-sidebar', '/news')).toBe(true);

    const optedIn = configWith({ mode: 'house', gamblingAds: true });
    expect(shouldRenderAd(optedIn, 'layout-sidebar', '/odds')).toBe(true);
  });

  it('honours a disabled placement even where ads are otherwise allowed', () => {
    const config = configWith({
      mode: 'house',
      placements: { 'news-list-bottom': { enabled: false, slotId: null } },
    });
    expect(shouldRenderAd(config, 'news-list-bottom', '/news')).toBe(false);
  });
});

describe('client-side validation the API does not perform', () => {
  it('accepts a 10-20 digit ad unit id and rejects anything else', () => {
    expect(isValidAdUnitId('1234567890')).toBe(true);
    expect(isValidAdUnitId('12345678901234567890')).toBe(true);
    expect(isValidAdUnitId('123456789')).toBe(false);
    expect(isValidAdUnitId('abc')).toBe(false);
    expect(isValidAdUnitId('ca-pub-1234567890123456:1234567890')).toBe(false);
  });

  it('accepts the publisher id as pasted from the dashboard, prefix optional', () => {
    // The API strips a `ca-` prefix on save, so the client must not strip it.
    expect(isValidPublisherId('pub-1234567890123456')).toBe(true);
    expect(isValidPublisherId('ca-pub-1234567890123456')).toBe(true);
    expect(isValidPublisherId('CA-PUB-1234567890123456')).toBe(true);
    expect(isValidPublisherId('1234567890123456')).toBe(false);
    expect(isValidPublisherId('pub-abc')).toBe(false);
  });
});

describe('the unconfigured default', () => {
  it('matches what the API returns for a site with nothing configured', () => {
    expect(EMPTY_AD_CONFIG.mode).toBe('house');
    expect(EMPTY_AD_CONFIG.clientId).toBeNull();
    expect(EMPTY_AD_CONFIG.placements).toEqual({});
    expect(EMPTY_AD_CONFIG.gamblingAds).toBe(false);
    Object.values(EMPTY_AD_CONFIG.defaultSlots).forEach((value) => expect(value).toBeNull());
  });

  it('exposes every size as a default slot key', () => {
    expect(Object.keys(EMPTY_AD_CONFIG.defaultSlots).sort()).toEqual([...AD_SIZES].sort());
  });

  it('exposes exactly the three documented modes', () => {
    expect([...AD_MODES]).toEqual(['off', 'house', 'adsense']);
  });
});