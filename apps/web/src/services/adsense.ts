import { apiGet } from './api/client';
import { authHeaders } from './auth';
import { AD_SIZE_DIMENSIONS } from '../lib/advertisements/placements';
import type { AdSize } from '../lib/advertisements/registry';

/**
 * Client for the AdSense Management API, as proxied by `apps/api/src/adsense/`.
 *
 * All four routes are admin-only and sit behind the app-wide `/api` prefix, so they
 * are `/api/admin/adsense/*`. Everything except `status` throws 503 when the API
 * service has no AdSense credentials — gate the screen on `status.configured` rather
 * than letting each panel 503 on its own.
 */

/* ─── Allowlists ───
 *
 * An unlisted dimension or metric is a 400, not a silent drop (`@IsIn(..., { each: true })`).
 * Build the pickers from these lists so a user cannot construct a failing request.
 * Mirrors `ADSENSE_*` in `apps/api/src/adsense/adsense.types.ts`.
 */

export const ADSENSE_DATE_RANGES = [
  'CUSTOM',
  'TODAY',
  'YESTERDAY',
  'LAST_7_DAYS',
  'LAST_14_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
  'LAST_3_MONTHS',
  'LAST_6_MONTHS',
] as const;
export type AdSenseDateRange = (typeof ADSENSE_DATE_RANGES)[number];

export const ADSENSE_DIMENSIONS = [
  'DATE',
  'AD_UNIT_ID',
  'AD_CLIENT_ID',
  'DOMAIN_NAME',
  'URL',
  'COUNTRY_CODE',
  'DEVICE_TYPE_SIZE',
] as const;
export type AdSenseDimension = (typeof ADSENSE_DIMENSIONS)[number];

export const ADSENSE_METRICS = [
  'ESTIMATED_EARNINGS',
  'ESTIMATED_PAGE_VIEWS',
  'PAGE_VIEWS',
  'IMPRESSIONS',
  'IMPRESSIONS_RPM',
  'PAGE_VIEWS_RPM',
  'CLICKS',
  'AD_REQUESTS',
  'AD_REQUESTS_SHOWN',
  'AD_REQUESTS_BLOCKED',
  'MATCHED_AD_REQUESTS',
  'AD_REQUESTS_RPM',
  'AD_REQUEST_TARGETING',
  'COST_PER_CLICK',
  'COST_PER_THOUSAND_IMPRESSIONS',
] as const;
export type AdSenseMetric = (typeof ADSENSE_METRICS)[number];

export const DEFAULT_REPORT_DIMENSIONS: AdSenseDimension[] = ['DATE'];
export const DEFAULT_REPORT_METRICS: AdSenseMetric[] = [
  'ESTIMATED_EARNINGS',
  'PAGE_VIEWS',
  'IMPRESSIONS',
  'IMPRESSIONS_RPM',
];

export const DEFAULT_REPORT_LIMIT = 1000;
export const MAX_REPORT_LIMIT = 10_000;
/** A custom range longer than this is a 400, not a 503. */
export const MAX_REPORT_RANGE_DAYS = 400;

/* ─── Status ─── */

export type AdSenseAuthMode = 'service-account' | 'access-token' | 'none';

export type AdSenseStatus = {
  /** False when no AdSense credentials are set on the API service. Never throws. */
  configured: boolean;
  authMode: AdSenseAuthMode;
  /** From `ADSENSE_ACCOUNT_ID`, when pinned. Otherwise discovered per call. */
  accountId: string | null;
  /** From `ADSENSE_AD_CLIENT_ID`, when pinned. Normalised to `ca-pub-…`. */
  adClientId: string | null;
  /** The bare `pub-…` half of `adClientId`. */
  publisherId: string | null;
};

/* ─── Ad units ─── */

export type AdSenseAdUnitState = 'ACTIVE' | 'ARCHIVED' | 'STATE_UNSPECIFIED';

export type AdSenseAdUnit = {
  /**
   * Bare numeric id for `data-ad-slot`. Typed nullable in the DTO, but a unit that
   * reaches you always has one — units with no usable numeric id are dropped and
   * counted in `skipped`. Render it without a null check.
   */
  slotId: string | null;
  displayName: string;
  state: AdSenseAdUnitState;
  /** Raw AdSense size, e.g. `728x90`, or `1x3`/`fluid` for responsive units. */
  size: string | null;
  type: string | null;
  /** Dropdown grouping label only — it never decides what renders. */
  suggestedSize: AdSize | null;
  resourceName: string;
  /** The `ca-pub-…:…` reporting id. Report filters only, never a `slotId`. */
  reportingDimensionId: string | null;
};

export type AdSenseAdUnitsResponse = {
  adUnits: AdSenseAdUnit[];
  /** Units AdSense returned with no usable numeric id. Should always be 0. */
  skipped: number;
};

/* ─── Policy issues ─── */

export type AdSensePolicyAction =
  | 'WARNED'
  | 'AD_SERVING_RESTRICTED'
  | 'AD_SERVING_DISABLED'
  | 'AD_SERVED_WITH_CLICK_CONFIRMATION'
  | 'AD_PERSONALIZATION_RESTRICTED'
  | 'ENFORCEMENT_ACTION_UNSPECIFIED';

export type AdSensePolicyIssue = {
  resourceName: string;
  entityType: string;
  site: string;
  siteSection: string | null;
  uri: string | null;
  action: AdSensePolicyAction;
  topics: string[];
  topicTypes: string[];
  adRequestCount: number;
  firstDetectedDate: string | null;
  lastDetectedDate: string | null;
  /** When `WARNED`, the date enforcement begins unless the issue is resolved. */
  warningEscalationDate: string | null;
};

export type AdSensePolicyIssueSummary = {
  total: number;
  disabled: number;
  restricted: number;
  warned: number;
  other: number;
};

export type AdSensePolicyIssuesResponse = {
  /** Ordered most severe first. */
  policyIssues: AdSensePolicyIssue[];
  summary: AdSensePolicyIssueSummary;
};

/* ─── Reports ─── */

export type AdSenseReportColumn = {
  name: string;
  /** AdSense values: `DIMENSION`, `METRIC`, `METRIC_RPM`. */
  type: string;
};

export type AdSenseReport = {
  /** Null unless a custom range was used. */
  startDate: string | null;
  endDate: string | null;
  dimensions: AdSenseDimension[];
  metrics: AdSenseMetric[];
  columns: AdSenseReportColumn[];
  /** One entry per row, keyed by column name. Every cell is a string. */
  rows: Record<string, string>[];
  totals: Record<string, string> | null;
  /** Rows matched before the limit was applied. */
  totalMatchedRows: number | null;
  /** True when `totalMatchedRows > rows.length`. */
  truncated: boolean;
};

export type AdSenseReportQueryInput = {
  dateRange?: AdSenseDateRange;
  startDate?: string;
  endDate?: string;
  dimensions?: AdSenseDimension[];
  metrics?: AdSenseMetric[];
  /** Bare slot id or a full `ca-pub-…:…` reporting id. */
  adUnitId?: string;
  limit?: number;
  timeZone?: string;
  currencyCode?: string;
};

/* ─── Fetchers ─── */

function adminOptions(signal?: AbortSignal) {
  return { signal, headers: authHeaders() };
}

/** The cheap admin diagnostic. Reports local env state and makes no upstream call. */
export function fetchAdSenseStatus(signal?: AbortSignal): Promise<AdSenseStatus> {
  return apiGet<AdSenseStatus>('/admin/adsense/status', undefined, adminOptions(signal));
}

/**
 * There is no pagination field: the service walks AdSense's pages itself and returns
 * everything. Do not write a paginator against this. `includeArchived` defaults to
 * false server-side, but archived units can still serve ads, so keep them selectable.
 */
export function fetchAdSenseAdUnits(
  includeArchived = false,
  signal?: AbortSignal,
): Promise<AdSenseAdUnitsResponse> {
  return apiGet<AdSenseAdUnitsResponse>(
    '/admin/adsense/ad-units',
    { includeArchived },
    adminOptions(signal),
  );
}

/** An empty list is the normal case, not an error — Google only returns issues once an AFC ad client is ready. */
export function fetchAdSensePolicyIssues(signal?: AbortSignal): Promise<AdSensePolicyIssuesResponse> {
  return apiGet<AdSensePolicyIssuesResponse>('/admin/adsense/policy-issues', undefined, adminOptions(signal));
}

/**
 * Cached 5 minutes per parameter combination server-side, so repeat views are cheap —
 * but every distinct parameter set is a separate upstream call. Debounce filter changes
 * rather than firing one request per toggle.
 */
export function fetchAdSenseReport(
  query: AdSenseReportQueryInput = {},
  signal?: AbortSignal,
): Promise<AdSenseReport> {
  const params = {
    dateRange: query.dateRange,
    startDate: query.startDate,
    endDate: query.endDate,
    // `buildQuery` emits a single value per key, and the DTO's `toList` accepts a
    // comma-separated string, so joining is the supported way to send a list.
    dimensions: query.dimensions?.length ? query.dimensions.join(',') : undefined,
    metrics: query.metrics?.length ? query.metrics.join(',') : undefined,
    adUnitId: query.adUnitId,
    limit: query.limit,
    timeZone: query.timeZone,
    currencyCode: query.currencyCode,
  };
  return apiGet<AdSenseReport>('/admin/adsense/reports', params, adminOptions(signal));
}

/* ─── Value parsing ───
 *
 * AdSense returns every cell as a string, including earnings and RPM. Parse before
 * summing, sorting numerically, or formatting currency.
 */

export function parseAdSenseNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type AdSenseMetricKind = 'currency' | 'number' | 'rpm' | 'text';

const CURRENCY_METRICS: readonly string[] = ['ESTIMATED_EARNINGS', 'AD_REQUESTS_RPM'];
const RPM_METRICS: readonly string[] = [
  'IMPRESSIONS_RPM',
  'PAGE_VIEWS_RPM',
  'AD_REQUESTS_RPM',
  'COST_PER_CLICK',
  'COST_PER_THOUSAND_IMPRESSIONS',
];

export function adSenseMetricKind(name: string): AdSenseMetricKind {
  if (CURRENCY_METRICS.includes(name)) return 'currency';
  if (RPM_METRICS.includes(name)) return 'rpm';
  if (name === 'AD_REQUEST_TARGETING') return 'text';
  return 'number';
}

/** Falls back to plain formatting when the currency code is unknown or empty. */
export function formatAdSenseCurrency(value: number | null, currencyCode?: string | null): string {
  if (value === null) return '—';
  const code = (currencyCode || '').trim().toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code || 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code || ''}`.trim();
  }
}

export function formatAdSenseCount(value: string | null | undefined): string {
  const parsed = parseAdSenseNumber(value);
  if (parsed === null) return '—';
  return new Intl.NumberFormat('en-US').format(parsed);
}

export function formatAdSenseRpm(value: string | null | undefined): string {
  const parsed = parseAdSenseNumber(value);
  if (parsed === null) return '—';
  return parsed.toFixed(3);
}

/** Formats one report cell according to its column name. */
export function formatAdSenseCell(column: string, value: string | null | undefined): string {
  switch (adSenseMetricKind(column)) {
    case 'currency':
      return formatAdSenseCurrency(parseAdSenseNumber(value), null);
    case 'rpm':
      return formatAdSenseRpm(value);
    case 'number':
      return formatAdSenseCount(value);
    default:
      return value ?? '';
  }
}

/* ─── Date range validation ─── */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function daysBetween(start: string, end: string): number {
  const from = new Date(`${start}T00:00:00Z`).getTime();
  const to = new Date(`${end}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

/**
 * Mirrors the API's 400s so the date picker cannot construct a failing request:
 * the two dates must be sent together, must not be inverted, and the range is
 * capped. Returns an error message, or `null` when the range is valid.
 */
export function validateAdSenseDateRange(start: string, end: string): string | null {
  if (!ISO_DATE_RE.test(start) || !ISO_DATE_RE.test(end)) return 'Dates must be YYYY-MM-DD.';
  const days = daysBetween(start, end);
  if (days < 0) return 'Start date must not be after end date.';
  if (days > MAX_REPORT_RANGE_DAYS) return `Date range is limited to ${MAX_REPORT_RANGE_DAYS} days.`;
  return null;
}

/* ─── Ad unit grouping ─── */

export type AdSenseAdUnitGroup = {
  /** An `AdSize`, or `'other'` for units with no confident size suggestion. */
  suggestedSize: AdSize | 'other';
  label: string;
  adUnits: AdSenseAdUnit[];
};

const SIZE_GROUP_LABELS: Record<AdSize, string> = {
  leaderboard: `Leaderboard (${AD_SIZE_DIMENSIONS.leaderboard.label})`,
  'tablet-banner': `Tablet banner (${AD_SIZE_DIMENSIONS['tablet-banner'].label})`,
  'mobile-banner': `Mobile banner (${AD_SIZE_DIMENSIONS['mobile-banner'].label})`,
  'medium-rectangle': `Medium rectangle (${AD_SIZE_DIMENSIONS['medium-rectangle'].label})`,
  'large-rectangle': `Large rectangle (${AD_SIZE_DIMENSIONS['large-rectangle'].label})`,
  'half-page': `Half page (${AD_SIZE_DIMENSIONS['half-page'].label})`,
};

/** Groups the dropdown by `suggestedSize`, keeping an "other" bucket for ambiguous units. */
export function groupAdUnitsBySuggestedSize(adUnits: AdSenseAdUnit[]): AdSenseAdUnitGroup[] {
  const groups = new Map<AdSize | 'other', AdSenseAdUnit[]>();
  for (const unit of adUnits) {
    const key = unit.suggestedSize ?? 'other';
    const bucket = groups.get(key);
    if (bucket) bucket.push(unit);
    else groups.set(key, [unit]);
  }

  const order: Array<AdSize | 'other'> = [
    'leaderboard',
    'large-rectangle',
    'medium-rectangle',
    'half-page',
    'tablet-banner',
    'mobile-banner',
    'other',
  ];

  return order
    .filter((key) => groups.has(key))
    .map((key) => ({
      suggestedSize: key,
      label: key === 'other' ? 'No size suggestion' : SIZE_GROUP_LABELS[key],
      adUnits: groups.get(key)!,
    }));
}

/** The value an admin pastes from the AdSense dashboard, as it goes into `slotId`. */
export function adUnitOptionLabel(unit: AdSenseAdUnit): string {
  const archived = unit.state === 'ARCHIVED' ? ' · archived' : '';
  return `${unit.displayName} — ${unit.slotId}${archived}`;
}

/* ─── Error messaging ─── */

/**
 * Pulls the server's own message out of an API failure.
 *
 * Worth surfacing verbatim rather than a generic "something went wrong", because the
 * backend distinguishes the cases that actually matter here: credentials rejected by
 * Google (fix the AdSense-side grant) versus not configured at all (fix the env).
 */
export function adSenseErrorMessage(error: unknown, fallback: string): string {
  const body = (error as { body?: unknown } | null)?.body;
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message)) return message.filter(Boolean).join(' ');
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * `status.configured` only reports local env state — the backend deliberately makes
 * no upstream call for it. Credentials can be present and still be rejected by
 * Google, so the admin screen must never treat `configured` as "working".
 */
export function adsenseCredentialsRejected(message: string): boolean {
  return /rejected the credentials/i.test(message);
}

/* ─── Policy issue presentation ─── */

const POLICY_ACTION_LABELS: Record<AdSensePolicyAction, string> = {
  AD_SERVING_DISABLED: 'Ad serving disabled',
  AD_SERVING_RESTRICTED: 'Ad serving restricted',
  WARNED: 'Warned',
  AD_SERVED_WITH_CLICK_CONFIRMATION: 'Served with click confirmation',
  AD_PERSONALIZATION_RESTRICTED: 'Personalization restricted',
  ENFORCEMENT_ACTION_UNSPECIFIED: 'Unspecified',
};

const POLICY_ACTION_TONES: Record<AdSensePolicyAction, 'danger' | 'warning' | 'neutral'> = {
  AD_SERVING_DISABLED: 'danger',
  AD_SERVING_RESTRICTED: 'danger',
  WARNED: 'warning',
  AD_SERVED_WITH_CLICK_CONFIRMATION: 'warning',
  AD_PERSONALIZATION_RESTRICTED: 'warning',
  ENFORCEMENT_ACTION_UNSPECIFIED: 'neutral',
};

export function policyActionLabel(action: AdSensePolicyAction): string {
  return POLICY_ACTION_LABELS[action] ?? action;
}

export function policyActionTone(action: AdSensePolicyAction): 'danger' | 'warning' | 'neutral' {
  return POLICY_ACTION_TONES[action] ?? 'neutral';
}

/** `'gambling'` is the topic that lands here when the site opts into `ads.gamblingAds`. */
export function isGamblingPolicyIssue(issue: AdSensePolicyIssue): boolean {
  return (issue.topics || []).some((topic) => topic.toLowerCase() === 'gambling');
}