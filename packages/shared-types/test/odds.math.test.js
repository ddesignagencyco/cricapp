import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  impliedProbabilityFromDecimal,
  bookmakerMarginFromDecimals,
  percentOddsMovement,
  decimalToFractional,
  fractionalToDecimal,
  americanToDecimal,
  decimalToAmerican,
  formatOddsFromDecimal,
} from '../src/odds.math.js';

describe('odds.math', () => {
  it('converts decimal to implied probability', () => {
    assert.equal(impliedProbabilityFromDecimal(2), 0.5);
    assert.equal(impliedProbabilityFromDecimal(1), null);
  });

  it('computes bookmaker margin from outcome decimals', () => {
    const margin = bookmakerMarginFromDecimals([1.91, 1.91]);
    assert.ok(margin !== null && margin > 0.04 && margin < 0.05);
  });

  it('computes percent movement on decimal odds', () => {
    assert.ok(Math.abs(percentOddsMovement(2, 2.2) - 10) < 1e-9);
  });

  it('round-trips fractional odds', () => {
    assert.equal(decimalToFractional(3.5), '5/2');
    assert.equal(fractionalToDecimal('5/2'), 3.5);
  });

  it('converts american odds', () => {
    assert.equal(americanToDecimal(150), 2.5);
    assert.equal(americanToDecimal(-200), 1.5);
    assert.equal(decimalToAmerican(2.5), 150);
  });

  it('formatOddsFromDecimal bundles formats', () => {
    const f = formatOddsFromDecimal(2);
    assert.equal(f.decimal, 2);
    assert.equal(f.impliedProbability, 0.5);
  });
});
