import type { Prisma } from '@prisma/client';

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

export const AD_PLACEMENT_KEY_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const PUBLISHER_ID_RE = /^pub-\d{10,20}$/;
const AD_UNIT_ID_RE = /^\d{10,20}$/;

/**
 * Best-effort mapping from an AdSense unit size to one of our placement sizes,
 * used only to group the admin ad-unit dropdown. The pixel dimensions must line
 * up with `SLOT_META` in `apps/web/src/lib/advertisements/placements.ts`, so
 * 336x280 is `large-rectangle` and 300x600 is `half-page`. Responsive units
 * report sizes like `1x3` or `fluid`, which deliberately map to `null`.
 */
const AD_SIZE_BY_DIMENSIONS: Record<string, AdSize> = {
  '728x90': 'leaderboard',
  '970x90': 'leaderboard',
  '970x250': 'leaderboard',
  '468x60': 'tablet-banner',
  '320x50': 'mobile-banner',
  '300x50': 'mobile-banner',
  '320x100': 'mobile-banner',
  '300x250': 'medium-rectangle',
  '336x280': 'large-rectangle',
  '300x600': 'half-page',
  '160x600': 'half-page',
  '320x480': 'half-page',
};

export function suggestAdSizeForDimensions(size: unknown): AdSize | null {
  if (typeof size !== 'string') return null;
  return AD_SIZE_BY_DIMENSIONS[size.trim().toLowerCase()] ?? null;
}

export type AdPlacementConfig = {
  enabled: boolean;
  slotId: string | null;
};

export type AdConfig = {
  /** `off` renders nothing, `house` renders the built-in placeholders, `adsense` serves Google ads. */
  mode: AdMode;
  /** Google AdSense publisher id (`pub-…`). Empty when AdSense is not configured. */
  clientId: string | null;
  /** Fallback ad unit per size, used when a placement has no slot of its own. */
  defaultSlots: Record<AdSize, string | null>;
  placements: Record<string, AdPlacementConfig>;
  /** Admin opt-in to serving any ads on the betting-adjacent routes. */
  gamblingAds: boolean;
};

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

export function isValidAdPublisherId(value: string): boolean {
  return PUBLISHER_ID_RE.test(value.trim());
}

export function isValidAdUnitId(value: string): boolean {
  return AD_UNIT_ID_RE.test(value.trim());
}

/** Accepts `ca-pub-123` and normalises it to the bare `pub-123` form. */
export function normalizePublisherId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // Lowercase first, otherwise an uppercase `CA-` prefix is not stripped.
  const normalized = value.trim().toLowerCase().replace(/^ca-/, '');
  return PUBLISHER_ID_RE.test(normalized) ? normalized : null;
}

/** Accepts a bare numeric unit id; anything else is discarded. */
export function normalizeAdUnitId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return AD_UNIT_ID_RE.test(trimmed) ? trimmed : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeDefaultSlots(value: unknown): Record<AdSize, string | null> {
  const slots = { ...EMPTY_AD_CONFIG.defaultSlots };
  if (!isPlainObject(value)) return slots;
  for (const size of AD_SIZES) {
    slots[size] = normalizeAdUnitId(value[size]);
  }
  return slots;
}

function normalizePlacements(value: unknown): Record<string, AdPlacementConfig> {
  if (!isPlainObject(value)) return {};
  const placements: Record<string, AdPlacementConfig> = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = rawKey.trim().toLowerCase();
    if (!AD_PLACEMENT_KEY_RE.test(key)) continue;
    if (!isPlainObject(rawValue)) continue;
    placements[key] = {
      enabled: rawValue.enabled !== false,
      slotId: normalizeAdUnitId(rawValue.slotId),
    };
  }
  return placements;
}

function normalizeMode(value: unknown): AdMode {
  return AD_MODES.includes(value as AdMode) ? (value as AdMode) : 'house';
}

/**
 * Coerces whatever is stored (or submitted) into a complete `AdConfig`. The
 * website's placement registry decides which placements are on by default; the
 * API only guarantees shape, so an unrecognised mode degrades to `house`
 * instead of blanking the site.
 */
export function normalizeAdConfig(value: unknown): AdConfig {
  if (!isPlainObject(value)) return { ...EMPTY_AD_CONFIG };
  return {
    mode: normalizeMode(value.mode),
    clientId: normalizePublisherId(value.clientId),
    defaultSlots: normalizeDefaultSlots(value.defaultSlots),
    placements: normalizePlacements(value.placements),
    gamblingAds: value.gamblingAds === true,
  };
}

export function toAdConfigJson(config: AdConfig): Prisma.InputJsonValue {
  return config as unknown as Prisma.InputJsonValue;
}
