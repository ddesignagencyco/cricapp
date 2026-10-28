import { oversToBalls } from '../../lib/cricketMath';

/**
 * Reading what people type into the calculators.
 *
 * `num()` turns anything it cannot read into 0, which is right for a field left blank
 * but quietly wrong for a typo: "3.7" overs became 4.1 and a negative score was used
 * as typed. These readers keep blank as blank and say what is wrong with the rest, so
 * a tool can show a message and a dash instead of a confident wrong number.
 */
export interface ToolInput {
  /** The number, or null when the field is blank or invalid. */
  value: number | null;
  /** A sentence for the person, or null when the field is fine (or blank). */
  error: string | null;
}

const BLANK: ToolInput = { value: null, error: null };

export function readNumber(
  raw: string,
  label: string,
  opts: { min?: number; max?: number; integer?: boolean } = {},
): ToolInput {
  const text = raw.trim();
  if (!text) return BLANK;
  const n = Number(text);
  if (!Number.isFinite(n)) return { value: null, error: `${label} must be a number.` };
  const min = opts.min ?? 0;
  if (n < min) {
    return { value: null, error: min === 0 ? `${label} cannot be negative.` : `${label} must be at least ${min}.` };
  }
  if (opts.integer && !Number.isInteger(n)) return { value: null, error: `${label} must be a whole number.` };
  if (opts.max !== undefined && n > opts.max) return { value: null, error: `${label} cannot be more than ${opts.max}.` };
  return { value: n, error: null };
}

export function readWickets(raw: string, label: string): ToolInput {
  return readNumber(raw, label, { integer: true, max: 10 });
}

/** True when `n` is written the cricket way: whole overs, then 0–5 balls after the dot. */
export function isValidCricketOvers(n: number): boolean {
  if (!Number.isFinite(n) || n < 0) return false;
  const balls = (n - Math.trunc(n)) * 10;
  const rounded = Math.round(balls);
  return Math.abs(balls - rounded) < 1e-6 && rounded <= 5;
}

/**
 * Overs in cricket notation (10.3 is ten overs and three balls). The value stays in
 * that notation so it can go straight into the cricketMath helpers. `max` is in the
 * same notation and is compared in balls.
 */
export function readOvers(raw: string, label: string, opts: { max?: number } = {}): ToolInput {
  const base = readNumber(raw, label);
  if (base.value === null) return base;
  if (!isValidCricketOvers(base.value)) {
    return { value: null, error: `${label}: use overs.balls with 0–5 balls, e.g. 12.4.` };
  }
  if (opts.max !== undefined) {
    const balls = oversToBalls(base.value);
    const maxBalls = oversToBalls(opts.max);
    if (balls !== null && maxBalls !== null && balls > maxBalls) {
      return { value: null, error: `${label} cannot be more than ${opts.max} overs.` };
    }
  }
  return base;
}

/** The first message among several inputs, so a tool shows one problem at a time. */
export function firstError(...inputs: Array<ToolInput | null | undefined>): string | null {
  for (const input of inputs) {
    if (input?.error) return input.error;
  }
  return null;
}
