/** @typedef {'decimal' | 'fractional' | 'american'} OddsFormat */

/**
 * @param {number} decimal
 * @returns {number|null}
 */
export function impliedProbabilityFromDecimal(decimal) {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  return 1 / decimal;
}

/**
 * Sum of implied probabilities minus 1 (overround). Pass all outcome decimals for one market.
 * @param {number[]} decimals
 * @returns {number|null}
 */
export function bookmakerMarginFromDecimals(decimals) {
  if (!Array.isArray(decimals) || decimals.length < 2) return null;
  let sum = 0;
  for (const d of decimals) {
    const p = impliedProbabilityFromDecimal(d);
    if (p === null) return null;
    sum += p;
  }
  return sum - 1;
}

/**
 * @param {number} openingDecimal
 * @param {number} currentDecimal
 * @returns {number|null} Percent change in decimal odds (not implied prob).
 */
export function percentOddsMovement(openingDecimal, currentDecimal) {
  if (!Number.isFinite(openingDecimal) || openingDecimal <= 0 || !Number.isFinite(currentDecimal)) {
    return null;
  }
  return ((currentDecimal - openingDecimal) / openingDecimal) * 100;
}

/**
 * @param {number} decimal
 * @returns {string|null}
 */
export function decimalToFractional(decimal) {
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

/**
 * @param {string} fractional e.g. "5/2" or "1/1"
 * @returns {number|null}
 */
export function fractionalToDecimal(fractional) {
  if (typeof fractional !== 'string') return null;
  const trimmed = fractional.trim();
  const slash = trimmed.indexOf('/');
  if (slash === -1) return null;
  const num = Number(trimmed.slice(0, slash));
  const den = Number(trimmed.slice(slash + 1));
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0 || num < 0) return null;
  return num / den + 1;
}

/**
 * @param {number} american
 * @returns {number|null}
 */
export function americanToDecimal(american) {
  if (!Number.isFinite(american) || american === 0) return null;
  if (american > 0) return american / 100 + 1;
  return 100 / Math.abs(american) + 1;
}

/**
 * @param {number} decimal
 * @returns {number|null}
 */
export function decimalToAmerican(decimal) {
  if (!Number.isFinite(decimal) || decimal <= 1) return null;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/**
 * @param {number} decimal
 * @returns {{ decimal: number, fractional: string, american: number, impliedProbability: number|null }}
 */
export function formatOddsFromDecimal(decimal) {
  return {
    decimal,
    fractional: decimalToFractional(decimal) ?? '',
    american: decimalToAmerican(decimal) ?? 0,
    impliedProbability: impliedProbabilityFromDecimal(decimal),
  };
}

/**
 * @param {number | string} value
 * @param {OddsFormat} format
 * @returns {number|null}
 */
export function parseOddsToDecimal(value, format) {
  switch (format) {
    case 'decimal':
      return typeof value === 'number' && Number.isFinite(value) && value > 1 ? value : null;
    case 'american':
      return typeof value === 'number' ? americanToDecimal(value) : null;
    case 'fractional':
      return typeof value === 'string' ? fractionalToDecimal(value) : null;
    default:
      return null;
  }
}

/**
 * @param {number} a
 * @param {number} b
 */
function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}
