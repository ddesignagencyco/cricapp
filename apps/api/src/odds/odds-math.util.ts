/** Keep in sync with `@cricapp/shared-types` `odds.math.js` (Jest cannot load that ESM from TS tests). */

export type OddsFormat = 'decimal' | 'fractional' | 'american';

export function impliedProbabilityFromDecimal(decimal: number): number | null {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  return 1 / decimal;
}

export function bookmakerMarginFromDecimals(decimals: number[]): number | null {
  if (!Array.isArray(decimals) || decimals.length < 2) return null;
  let sum = 0;
  for (const d of decimals) {
    const p = impliedProbabilityFromDecimal(d);
    if (p === null) return null;
    sum += p;
  }
  return sum - 1;
}

export function percentOddsMovement(openingDecimal: number, currentDecimal: number): number | null {
  if (!Number.isFinite(openingDecimal) || openingDecimal <= 0 || !Number.isFinite(currentDecimal)) {
    return null;
  }
  return ((currentDecimal - openingDecimal) / openingDecimal) * 100;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export function decimalToFractional(decimal: number): string | null {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  const profit = decimal - 1;
  const maxDen = 100;
  let bestNum = 1;
  let bestDen = 1;
  let bestErr = Math.abs(profit - bestNum / bestDen);
  for (let den = 1; den <= maxDen; den += 1) {
    const num = Math.round(profit * den);
    if (num <= 0) continue;
    const err = Math.abs(profit - num / den);
    if (err < bestErr) {
      bestErr = err;
      bestNum = num;
      bestDen = den;
    }
  }
  const g = gcd(bestNum, bestDen);
  return `${bestNum / g}/${bestDen / g}`;
}

export function fractionalToDecimal(fractional: string): number | null {
  const trimmed = fractional.trim();
  const slash = trimmed.indexOf('/');
  if (slash === -1) return null;
  const num = Number(trimmed.slice(0, slash));
  const den = Number(trimmed.slice(slash + 1));
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0 || num < 0) return null;
  return num / den + 1;
}

export function americanToDecimal(american: number): number | null {
  if (!Number.isFinite(american) || american === 0) return null;
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

export function decimalToAmerican(decimal: number): number | null {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

export function formatOddsFromDecimal(decimal: number) {
  return {
    decimal,
    fractional: decimalToFractional(decimal) ?? '',
    american: decimalToAmerican(decimal) ?? 0,
    impliedProbability: impliedProbabilityFromDecimal(decimal),
  };
}

export function parseOddsToDecimal(value: number | string, format: OddsFormat): number | null {
  switch (format) {
    case 'decimal':
      return typeof value === 'number' && Number.isFinite(value) && value > 1 ? value : null;
    case 'american':
      return typeof value === 'number' ? americanToDecimal(value) : null;
    case 'fractional':
      return typeof value === 'string' ? fractionalToDecimal(value) : null;
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}
