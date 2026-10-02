import type { OddsFormats, OddsPriceFormat, OddsSelectionPrice } from '../types/odds';

export const ODDS_AGE_CONSENT_KEY = 'pcz-odds-age-confirmed';

export function formatOddsPrice(formats: OddsFormats, mode: OddsPriceFormat): string {
  switch (mode) {
    case 'decimal':
      return Number(formats.decimal).toFixed(2);
    case 'fractional':
      return formats.fractional || '—';
    case 'american': {
      const n = Number(formats.american);
      if (!Number.isFinite(n)) return '—';
      return n > 0 ? `+${n}` : String(n);
    }
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function formatMovementPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatMarginPercent(margin: number | null): string {
  if (margin === null || !Number.isFinite(margin)) return '';
  return `~${(margin * 100).toFixed(1)}%`;
}

/**
 * What share of the money bet comes back, as a whole percentage.
 *
 * The margin was originally printed as "Added by bookmakers 6.0%", which asks the
 * reader to do arithmetic in their head. Payout is the same number the other way up and
 * is the phrase the comparison sites use, so 6% margin reads as "Payout 94%".
 */
export function formatPayoutPercent(margin: number | null): string {
  if (margin === null || !Number.isFinite(margin)) return '';
  // A margin outside 0–1 is a bad upstream number, not a real payout. Clamping keeps a
  // broken value from rendering as "Payout -320%" in the middle of the table.
  const payout = Math.min(1, Math.max(0, 1 - margin));
  return `${Math.round(payout * 100)}%`;
}

export function formatOddsUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

export function groupSelectionsByKey(
  selections: OddsSelectionPrice[],
): Map<string, OddsSelectionPrice[]> {
  const map = new Map<string, OddsSelectionPrice[]>();
  for (const row of selections) {
    const list = map.get(row.selectionKey) ?? [];
    list.push(row);
    map.set(row.selectionKey, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.current.decimal - a.current.decimal);
  }
  return map;
}

export function impliedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function modelPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

export function readOddsAgeConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ODDS_AGE_CONSENT_KEY) === '1';
}

export function storeOddsAgeConsent(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ODDS_AGE_CONSENT_KEY, '1');
}

export function isOddsSeedSource(source: { sourceSlug: string; sourceName: string }): boolean {
  return source.sourceSlug.toLowerCase().startsWith('demo-book-')
    || source.sourceName.toLowerCase().includes('(dev)');
}

const STALE_PRICE_MS = 15 * 60 * 1000;

export function isOddsCaptureStale(capturedAt: string, nowMs = Date.now()): boolean {
  const t = new Date(capturedAt).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t > STALE_PRICE_MS;
}
