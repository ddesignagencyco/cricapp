import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PREMATCH_WEIGHTS, scorePrematch, sigmoid } from '../src/prematch.js';

describe('sigmoid', () => {
  it('maps 0 to 0.5 and saturates at the extremes', () => {
    assert.equal(sigmoid(0), 0.5);
    assert.ok(sigmoid(8) > 0.99);
    assert.ok(sigmoid(-8) < 0.01);
  });
});

describe('scorePrematch', () => {
  const base = {
    form: { home: 0.5, away: 0.5, homeN: 8, awayN: 8 },
    h2h: { edge: 0, meetings: 6 },
    table: { used: false, edge: 0 },
    venueEdge: 0,
    toss: { edge: 0 },
  };

  it('returns even probabilities when every edge is zero', () => {
    const out = scorePrematch(base);
    assert.equal(out.homeWinProb, 0.5);
    assert.equal(out.awayWinProb, 0.5);
    assert.ok(out.confidence > 0.5);
  });

  it('raises home win probability when home form and H2H are stronger', () => {
    const out = scorePrematch({
      ...base,
      form: { home: 0.8, away: 0.3, homeN: 8, awayN: 8 },
      h2h: { edge: 0.6, meetings: 6 },
      table: { used: true, edge: 0.4 },
      venueEdge: 1,
    });
    assert.ok(out.homeWinProb > 0.7);
    assert.equal(Number((out.homeWinProb + out.awayWinProb).toFixed(4)), 1);
    assert.equal(out.explanation.weights.form, PREMATCH_WEIGHTS.form);
  });

  it('lowers confidence when either team has fewer than 3 prior results', () => {
    const out = scorePrematch({
      ...base,
      form: { home: 0.9, away: 0.1, homeN: 1, awayN: 8 },
    });
    assert.equal(out.confidence, 0.35);
  });

  it('marks toss-adjusted explanations after a toss edge', () => {
    const out = scorePrematch({ ...base, toss: { edge: 1, wonBy: 'sr:competitor:1' } });
    assert.equal(out.explanation.tossAdjusted, true);
    assert.ok(out.homeWinProb > 0.5);
  });
});
