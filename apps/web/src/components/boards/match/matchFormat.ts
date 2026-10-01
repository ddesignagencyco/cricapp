/**
 * Formatting for the match centre.
 *
 * Kept apart from the view model so the arithmetic that decides *what* a number
 * means stays testable, and this file only decides how it is spelled.
 *
 * ## Time zones
 *
 * A cricket match is played at the venue's local time, and the site renders it in
 * the venue's own zone rather than the reader's. The IANA zone comes from
 * `sport_event.venue.timezone`, so a night final in Perth is not labelled with a
 * Karachi clock.
 *
 * `suppressHydrationWarning` is not used here: every formatter takes an explicit
 * `timeZone`, which makes the output identical on the server and in the browser
 * regardless of where either runs.
 */

import { APP_TIME_ZONE } from '../../../utils/helpers';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: APP_TIME_ZONE,
};

const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  timeZone: APP_TIME_ZONE,
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: APP_TIME_ZONE,
};

function parse(iso: string | null | undefined): Date | null {
  const raw = String(iso ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `Tue, 30 Sep 2025` in the venue's zone. */
export function formatVenueDate(iso: string | null | undefined, timeZone?: string | null): string {
  const date = parse(iso);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', { ...DATE_FORMAT, ...(timeZone ? { timeZone } : {}) }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', DATE_FORMAT).format(date);
  }
}

/** `18:00` in the venue's zone. */
export function formatVenueTime(iso: string | null | undefined, timeZone?: string | null): string {
  const date = parse(iso);
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', { ...TIME_FORMAT, ...(timeZone ? { timeZone } : {}) }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', TIME_FORMAT).format(date);
  }
}

/** `30 Sep` — for the dense sidebar rows. */
export function formatShortDate(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', SHORT_DATE_FORMAT).format(date);
}

/**
 * The zone's short name, e.g. `PKT`.
 *
 * Falls back to the IANA identifier when the runtime has no name for the zone, so
 * the row is never left with a silently missing value.
 */
export function timeZoneLabel(timeZone: string | null | undefined): string {
  const zone = String(timeZone ?? '').trim();
  if (!zone) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date());
    const name = parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
    return name && name !== zone ? name : zone;
  } catch {
    return zone;
  }
}

/** `1st`, `2nd`, `3rd`, `4th`. */
export function ordinalInnings(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  if (n === 4) return '4th';
  return `${n}th`;
}

/** `150/10` → `150`, for splitting a score into its two parts. */
export function splitScore(score: string): { runs: string; wickets: string | null } {
  const m = String(score ?? '').trim().match(/^(\d+)\s*\/\s*(\d+)/);
  if (m) return { runs: m[1], wickets: m[2] };
  const runs = String(score ?? '').trim().match(/^(\d+)/);
  return { runs: runs ? runs[1] : '', wickets: null };
}

/** A run rate to two decimals, or an em dash when there is nothing to divide. */
export function rate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}
