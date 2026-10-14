/**
 * The single source of truth for which ad slots exist, what size each one is,
 * and whether an ad may render in the current route context.
 *
 * The API has no opinion about any of this. `apps/api/src/site-settings/ad.config.ts`
 * stores a free-form `Record<string, { enabled, slotId }>` and only guarantees that a
 * stored key matches `/^[a-z0-9][a-z0-9-]{0,63}$/`. It cannot validate placement names,
 * so the key set lives here and the admin screen offers exactly these rows.
 *
 * This module is a leaf: it imports nothing, so both `services/` and `components/`
 * can depend on it without a cycle.
 */

/* ─── Contract (mirrors apps/api/src/site-settings/ad.config.ts) ─── */

export const AD_MODES = ['off', 'house', 'adsense'] as const;
export type AdMode = (typeof AD_MODES)[number];

export const AD_SIZES = [
  'leaderboard',
  'tablet-banner',
  'mobile-banner',
  'medium-rectangle',
  'large-rectangle',
  'half-page',
] as const;
export type AdSize = (typeof AD_SIZES)[number];

export type AdPlacementConfig = {
  enabled: boolean;
  slotId: string | null;
};

export type AdConfig = {
  mode: AdMode;
  clientId: string | null;
  defaultSlots: Record<AdSize, string | null>;
  placements: Record<string, AdPlacementConfig>;
  gamblingAds: boolean;
};

export type AdPlacementInput = {
  enabled?: boolean;
  slotId?: string | null;
};

export type AdConfigInput = {
  mode?: AdMode;
  clientId?: string;
  defaultSlots?: Partial<Record<AdSize, string>>;
  placements?: Record<string, AdPlacementInput>;
  gamblingAds?: boolean;
};

/** Byte-identical to the API's `EMPTY_AD_CONFIG`, which is what an unconfigured site returns. */
export const EMPTY_AD_CONFIG: AdConfig = {
  mode: 'house',
  clientId: null,
  defaultSlots: {
    leaderboard: null,
    'tablet-banner': null,
    'mobile-banner': null,
    'medium-rectangle': null,
    'large-rectangle': null,
    'half-page': null,
  },
  placements: {},
  gamblingAds: false,
};

/* ─── Placement registry ─── */

/**
 * Where each placement lives on the site. Purely a UI concern — the API stores a
 * flat `placements` map and has no idea what a "page" is. Grouping exists so the
 * admin screen can show switch clusters instead of one wall of identical rows,
 * and so the label can name the route the admin has to visit to see the slot.
 */
export const AD_PLACEMENT_GROUPS = [
  { id: 'site', label: 'Site-wide', hint: 'Every page' },
  { id: 'home', label: 'Home page', hint: '/' },
  { id: 'news', label: 'News', hint: '/news' },
  { id: 'matches', label: 'Matches & schedule', hint: '/matches · /schedule' },
  { id: 'directory', label: 'Players, teams & authors', hint: '/players · /teams · /authors' },
  { id: 'competitions', label: 'Tournaments & PSL', hint: '/tournaments · /psl' },
  { id: 'betting', label: 'Odds & predictions', hint: '/odds · /predictions' },
] as const;

export type AdPlacementGroupId = (typeof AD_PLACEMENT_GROUPS)[number]['id'];

/**
 * A stored key the registry does not know. It renders nowhere, so it is kept out of
 * the page groups and shown last — it is config debt, not a real slot.
 */
export const UNREGISTERED_GROUP = {
  id: 'unregistered',
  label: 'Not in the site registry',
  hint: 'Stored keys that render nowhere',
} as const;

export type AdPlacementGroup = {
  id: string;
  label: string;
  hint: string;
};

const GROUPS_BY_ID: Record<string, AdPlacementGroup> = Object.fromEntries(
  [...AD_PLACEMENT_GROUPS, UNREGISTERED_GROUP].map((group) => [group.id, group as AdPlacementGroup]),
);

export function adPlacementGroup(id: string): AdPlacementGroup {
  return GROUPS_BY_ID[id] ?? UNREGISTERED_GROUP;
}

export type AdPlacement = {
  /** Storage key. Must match the API's `AD_PLACEMENT_KEY_RE`, or the API drops it. */
  key: string;
  /** Human label for the admin table. */
  label: string;
  size: AdSize;
  /** Must be one of `AD_PLACEMENT_GROUPS`, or the row falls back to the unregistered bucket. */
  group: string;
  /** Fills its grid cell instead of reserving the slot's own box. */
  inFeed?: boolean;
  /** Rendered on every route from `ClientLayout`, so one key covers all of them. */
  perRoute?: boolean;
};

export const AD_PLACEMENTS: readonly AdPlacement[] = [
  { key: 'global-top', label: 'Global top banner', size: 'leaderboard', group: 'site', perRoute: true },
  { key: 'layout-sidebar', label: 'Layout sidebar', size: 'medium-rectangle', group: 'site' },
  { key: 'search-bottom', label: 'Search — bottom', size: 'leaderboard', group: 'site' },

  { key: 'home-top-mobile', label: 'Mobile top', size: 'leaderboard', group: 'home' },
  { key: 'home-mid', label: 'Mid page', size: 'leaderboard', group: 'home' },
  { key: 'home-footer', label: 'Footer', size: 'leaderboard', group: 'home' },
  { key: 'home-multiplex', label: 'Multiplex (bottom)', size: 'leaderboard', group: 'home' },
  { key: 'home-sidebar', label: 'Sidebar', size: 'medium-rectangle', group: 'home', inFeed: true },

  { key: 'news-list-infeed', label: 'List — in feed', size: 'large-rectangle', group: 'news', inFeed: true },
  { key: 'news-list-bottom', label: 'List — bottom', size: 'leaderboard', group: 'news' },
  { key: 'news-detail-top', label: 'Detail — top (after hero)', size: 'leaderboard', group: 'news' },
  { key: 'news-detail-inarticle', label: 'Detail — in article', size: 'large-rectangle', group: 'news' },
  { key: 'news-detail-sidebar', label: 'Detail — sidebar', size: 'medium-rectangle', group: 'news' },
  { key: 'news-detail-after-related', label: 'Detail — after related', size: 'leaderboard', group: 'news' },

  { key: 'matches-infeed', label: 'Matches list — in feed', size: 'medium-rectangle', group: 'matches', inFeed: true },
  { key: 'match-detail-leaderboard', label: 'Match detail — leaderboard', size: 'leaderboard', group: 'matches' },
  { key: 'match-detail-after-overview', label: 'Match detail — after overview', size: 'leaderboard', group: 'matches' },
  { key: 'match-detail-sidebar', label: 'Match detail — sidebar', size: 'medium-rectangle', group: 'matches' },
  { key: 'schedule-infeed', label: 'Schedule — in feed', size: 'large-rectangle', group: 'matches', inFeed: true },

  { key: 'players-after-intro', label: 'Players list — after intro', size: 'leaderboard', group: 'directory' },
  { key: 'player-detail-after-intro', label: 'Player detail — after intro', size: 'leaderboard', group: 'directory' },
  { key: 'teams-after-intro', label: 'Teams list — after intro', size: 'leaderboard', group: 'directory' },
  { key: 'team-detail-after-intro', label: 'Team detail — after intro', size: 'leaderboard', group: 'directory' },
  { key: 'author-after-intro', label: 'Author — after intro', size: 'leaderboard', group: 'directory' },

  { key: 'tournament-detail-after-intro', label: 'Tournament — after intro', size: 'leaderboard', group: 'competitions' },
  { key: 'tournament-detail-sidebar', label: 'Tournament — sidebar', size: 'medium-rectangle', group: 'competitions' },
  { key: 'psl-after-intro', label: 'PSL — after intro', size: 'leaderboard', group: 'competitions' },
  { key: 'psl-half-page', label: 'PSL — half page', size: 'half-page', group: 'competitions' },

  { key: 'prediction-detail-sidebar', label: 'Prediction detail — sidebar', size: 'half-page', group: 'betting' },
  { key: 'prediction-detail-sidebar-mid', label: 'Prediction detail — sidebar (medium)', size: 'medium-rectangle', group: 'betting' },
];

/**
 * Buckets rows into the group order declared above, with the unregistered bucket
 * pinned last. Empty groups are dropped so the admin never sees a heading with
 * nothing under it.
 */
export function groupAdPlacementRows<T extends { key: string; group?: string }>(
  rows: readonly T[],
): Array<AdPlacementGroup & { rows: T[] }> {
  const buckets = new Map<string, T[]>();
  for (const row of rows) {
    const id = row.group && GROUPS_BY_ID[row.group] ? row.group : UNREGISTERED_GROUP.id;
    const bucket = buckets.get(id);
    if (bucket) bucket.push(row);
    else buckets.set(id, [row]);
  }

  const order = [...AD_PLACEMENT_GROUPS.map((group) => group.id as string), UNREGISTERED_GROUP.id];
  return order
    .filter((id) => (buckets.get(id)?.length ?? 0) > 0)
    .map((id) => ({ ...adPlacementGroup(id), rows: buckets.get(id) as T[] }));
}

const PLACEMENTS_BY_KEY: Record<string, AdPlacement> = Object.fromEntries(
  AD_PLACEMENTS.map((placement) => [placement.key, placement]),
);

export function adPlacement(key: string): AdPlacement | undefined {
  return PLACEMENTS_BY_KEY[key];
}

/** The size a placement resolves its slot id against. Falls back to `leaderboard`. */
export function adPlacementSize(key: string): AdSize {
  return PLACEMENTS_BY_KEY[key]?.size ?? 'leaderboard';
}

/* ─── Route gating ─── */

/**
 * Betting-adjacent routes. The backend deliberately has no opinion here — it stores
 * `ads.gamblingAds` and leaves the route list to the frontend.
 *
 * This has to cover *shared* placements too: the sidebar and the global top banner
 * render on these pages, so gating only the two `prediction-detail-*` placements
 * would not actually keep ads off them.
 */
const GAMBLING_ROUTE_PREFIXES = ['/odds', '/predictions'] as const;

export function isGamblingRoute(pathname: string): boolean {
  return GAMBLING_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/* ─── Config resolution ─── */

/**
 * Per-placement slot id first, then the size default — the same order the API
 * documents. A `null` result means `adsense` mode has nothing to render, and the
 * slot must collapse rather than show an empty box.
 */
export function resolveAdSlotId(placement: string, size: AdSize, config: AdConfig): string | null {
  return config.placements?.[placement]?.slotId ?? config.defaultSlots?.[size] ?? null;
}

/**
 * The API normalises `enabled` to `rawValue.enabled !== false`, so a placement that
 * is absent from the map is on by default. Only an explicit `false` disables it.
 */
export function adPlacementEnabled(placement: string, config: AdConfig): boolean {
  return config.placements?.[placement]?.enabled !== false;
}

/**
 * The single gate. Applied inside `AdSlot` rather than at each of the ~26 call
 * sites, so a new placement cannot forget one of the three checks.
 */
export function shouldRenderAd(
  config: AdConfig,
  placement: string,
  pathname: string,
  explicitSlotId?: string | null,
): boolean {
  if (!config || config.mode === 'off') return false;
  if (isGamblingRoute(pathname) && !config.gamblingAds) return false;
  if (!adPlacementEnabled(placement, config)) return false;
  // An explicit `slot` prop (e.g. a dedicated Multiplex unit) satisfies the id
  // requirement on its own; only the stored-config path needs a resolved id.
  if (config.mode === 'adsense' && !explicitSlotId && !resolveAdSlotId(placement, adPlacementSize(placement), config)) {
    return false;
  }
  return true;
}

/* ─── Client-side validation ─── */

/**
 * The API does not validate slot ids. `defaultSlots` and `placements` are
 * `Record<string, …>` without `@ValidateNested`, so class-validator never descends
 * into them and a bad id returns 200 with the value silently normalised to `null`.
 * The admin form has to catch it, or the admin sees a successful save and an
 * empty slot with no error anywhere.
 */
const AD_UNIT_ID_RE = /^\d{10,20}$/;
const PUBLISHER_ID_RE = /^(ca-)?pub-\d{10,20}$/i;

export function isValidAdUnitId(value: string): boolean {
  return AD_UNIT_ID_RE.test(value.trim());
}

/**
 * Accepts the string pasted straight from the AdSense dashboard. The `ca-` prefix
 * is optional and is stripped server-side, so do not strip it here.
 */
export function isValidPublisherId(value: string): boolean {
  return PUBLISHER_ID_RE.test(value.trim());
}

/** Trims a slot id for submission, or returns `null` when the box is empty. */
export function normalizeAdUnitIdInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Trims a publisher id for submission, or returns `null` when the box is empty. */
export function normalizePublisherIdInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}