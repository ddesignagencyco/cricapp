export type OddsFormat = 'decimal' | 'fractional' | 'american';

export function decimalFromFractional(num: number, den: number): number | null {
  if (den <= 0 || num < 0) return null;
  return num / den + 1;
}

/**
 * The `value` sent to the converter API for a fractional price. The sides go as typed:
 * rounding them sent 1.5/1 as 2/1 (decimal 3.00 instead of 2.50).
 */
export function fractionalQuery(num: number, den: number): string {
  if (!Number.isFinite(num) || !Number.isFinite(den) || num <= 0 || den <= 0) return '';
  return `${num}/${den}`;
}

export function decimalFromAmerican(american: number): number | null {
  if (!Number.isFinite(american) || american === 0) return null;
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

export function impliedFromDecimal(decimal: number): number | null {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  return 1 / decimal;
}

export function decimalFromImplied(prob: number): number | null {
  if (!Number.isFinite(prob) || prob <= 0 || prob >= 1) return null;
  return 1 / prob;
}

export function americanFromDecimal(decimal: number): number | null {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

export function fractionalFromDecimal(decimal: number): { num: number; den: number } | null {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  const ratio = decimal - 1;
  let bestNum = 1;
  let bestDen = 1;
  let bestErr = Infinity;
  for (let den = 1; den <= 40; den += 1) {
    const num = Math.round(ratio * den);
    if (num < 1) continue;
    const err = Math.abs(num / den - ratio);
    if (err < bestErr) {
      bestErr = err;
      bestNum = num;
      bestDen = den;
    }
  }
  return { num: bestNum, den: bestDen };
}

export function overround(implieds: number[]): number | null {
  const ok = implieds.filter((p) => Number.isFinite(p) && p > 0);
  if (ok.length < 2) return null;
  return ok.reduce((sum, p) => sum + p, 0) - 1;
}

export function formatPct(prob: number | null, digits = 1): string {
  if (prob === null) return '—';
  return `${(prob * 100).toFixed(digits)}%`;
}
