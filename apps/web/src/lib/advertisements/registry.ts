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

export type AdPlacement = {
  /** Storage key. Must match the API's `AD_PLACEMENT_KEY_RE`, or the API drops it. */
  key: string;
  /** Human label for the admin table. */
  label: string;
  size: AdSize;
  /** Fills its grid cell instead of reserving the slot's own box. */
  inFeed?: boolean;
  /** Rendered on every route from `ClientLayout`, so one key covers all of them. */
  perRoute?: boolean;
};

export const AD_PLACEMENTS: readonly AdPlacement[] = [
  { key: 'global-top', label: 'Global top banner', size: 'leaderboard', perRoute: true },
  { key: 'home-top-mobile', label: 'Home — mobile top', size: 'leaderboard' },
  { key: 'home-mid', label: 'Home — mid page', size: 'leaderboard' },
  { key: 'home-footer', label: 'Home — footer', size: 'leaderboard' },
  { key: 'home-sidebar', label: 'Home — sidebar', size: 'medium-rectangle', inFeed: true },
  { key: 'layout-sidebar', label: 'Layout sidebar', size: 'medium-rectangle' },
  { key: 'news-list-infeed', label: 'News list — in feed', size: 'large-rectangle', inFeed: true },
  { key: 'news-list-bottom', label: 'News list — bottom', size: 'leaderboard' },
  { key: 'news-detail-inarticle', label: 'News detail — in article', size: 'large-rectangle' },
  { key: 'news-detail-sidebar', label: 'News detail — sidebar', size: 'medium-rectangle' },
  { key: 'news-detail-after-related', label: 'News detail — after related', size: 'leaderboard' },
  { key: 'matches-infeed', label: 'Matches — in feed', size: 'medium-rectangle', inFeed: true },
  { key: 'match-detail-after-overview', label: 'Match detail — after overview', size: 'leaderboard' },
  { key: 'match-detail-sidebar', label: 'Match detail — sidebar', size: 'medium-rectangle' },
  { key: 'schedule-infeed', label: 'Schedule — in feed', size: 'large-rectangle', inFeed: true },
  { key: 'players-after-intro', label: 'Players — after intro', size: 'leaderboard' },
  { key: 'player-detail-after-intro', label: 'Player detail — after intro', size: 'leaderboard' },
  { key: 'teams-after-intro', label: 'Teams — after intro', size: 'leaderboard' },
  { key: 'team-detail-after-intro', label: 'Team detail — after intro', size: 'leaderboard' },
  { key: 'tournament-detail-after-intro', label: 'Tournament — after intro', size: 'leaderboard' },
  { key: 'tournament-detail-sidebar', label: 'Tournament — sidebar', size: 'medium-rectangle' },
  { key: 'psl-after-intro', label: 'PSL — after intro', size: 'leaderboard' },
  { key: 'psl-half-page', label: 'PSL — half page', size: 'half-page' },
  { key: 'author-after-intro', label: 'Author — after intro', size: 'leaderboard' },
  { key: 'prediction-detail-sidebar', label: 'Prediction detail — sidebar', size: 'half-page' },
  { key: 'prediction-detail-sidebar-mid', label: 'Prediction detail — sidebar (medium)', size: 'medium-rectangle' },
];

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
export function shouldRenderAd(config: AdConfig, placement: string, pathname: string): boolean {
  if (!config || config.mode === 'off') return false;
  if (isGamblingRoute(pathname) && !config.gamblingAds) return false;
  if (!adPlacementEnabled(placement, config)) return false;
  if (config.mode === 'adsense' && !resolveAdSlotId(placement, adPlacementSize(placement), config)) return false;
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