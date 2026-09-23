import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURE_NAMES,
  PREMATCH_WEIGHTS,
  featureVectorFromSnapshot,
  scorePrematch,
  sigmoid,
} from '../src/prematch.js';

describe('sigmoid', () => {
  it('maps 0 to 0.5 and saturates at the extremes', () => {
    assert.equal(sigmoid(0), 0.5);
    assert.ok(sigmoid(8) > 0.99);
    assert.ok(sigmoid(-8) < 0.01);
  });
});

describe('featureVectorFromSnapshot', () => {
  it('reconstructs the 9 feature values from a stored snapshot', () => {
    const vector = featureVectorFromSnapshot({
      format: 't20',
      form: { home: 0.8, away: 0.3 },
      h2h: { edge: 0.6 },
      table: { used: true, edge: 0.4 },
      venueEdge: 1,
      toss: { edge: 1 },
      conditions: { pitch: 'flat batting pitch', weather: 'dew expected' },
      squad: { used: true, edge: 0.25 },
    });
    assert.deepEqual(vector.names, FEATURE_NAMES);
    assert.equal(vector.values.length, 9);
    assert.equal(vector.values[0], Number((0.8 - 0.3).toFixed(4)));
    assert.equal(vector.values[6], 0.25);
    assert.equal(vector.values[7], 0);
    assert.equal(vector.values[8], 0);
  });

  it('defaults missing squad/conditions to zero', () => {
    const vector = featureVectorFromSnapshot({
      form: { home: 0.5, away: 0.5 },
      h2h: { edge: 0 },
      venueEdge: 0,
      toss: { edge: 0 },
    });
    assert.equal(vector.values[5], 0);
    assert.equal(vector.values[6], 0);
    assert.equal(vector.values[7], 0);
    assert.equal(vector.values[8], 0);
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

  it('uses learned per-format weights and intercept when provided', () => {
    const learnedWeights = {
      byFormat: {
        t20: {
          weights: { form: 2.0, h2h: 1.0, table: 0.5, venue: 0, toss: 0, conditions: 0, squad: 1.0 },
          intercept: -0.3,
        },
      },
    };
    const snapshot = {
      ...base,
      format: 't20',
      form: { home: 0.9, away: 0.1, homeN: 8, awayN: 8 },
      squad: { used: true, edge: 0.5 },
    };
    const out = scorePrematch(snapshot, { weights: learnedWeights });
    assert.equal(out.explanation.weightsSource, 'learned');
    assert.equal(out.explanation.weights.form, 2.0);
    assert.equal(out.explanation.learnedIntercept, -0.3);
    const expectedZ = -0.3 + 2.0 * 0.8 + 1.0 * 0.5;
    assert.equal(out.explanation.z, Number(expectedZ.toFixed(4)));
    assert.ok(out.homeWinProb > 0.7);
    const squadAttribution = out.explanation.factorAttributions.find((f) => f.factor === 'squad');
    assert.ok(squadAttribution.contribution > 0);
  });

  it('falls back to default weights when format has no learned weights', () => {
    const snapshot = { ...base, format: 'odi', form: { home: 0.6, away: 0.5, homeN: 8, awayN: 8 } };
    const out = scorePrematch(snapshot, {
      weights: { byFormat: { t20: { weights: { form: 5 }, intercept: 0 } } },
    });
    assert.equal(out.explanation.weightsSource, 'default');
    assert.equal(out.explanation.weights.form, PREMATCH_WEIGHTS.form);
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
    assert.ok(out.scoreRange.low < out.scoreRange.expected);
    assert.ok(out.scoreRange.expected < out.scoreRange.high);
    assert.equal(out.calibrationBand, 'high');
    assert.ok(out.explanation.factorAttributions.length >= 6);
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

  it('uses pitch/weather signals and stores player projections', () => {
    const out = scorePrematch({
      ...base,
      format: 't20',
      parScore: 160,
      conditions: { pitch: 'flat batting pitch', weather: 'dew expected' },
      playerProjections: {
        topBatters: [{ playerId: 'p1', probability: 1 }],
        topBowlers: [{ playerId: 'p2', probability: 1 }],
        xi: { home: [], away: [] },
      },
    });
    assert.ok(out.scoreRange.expected > 160);
    assert.equal(out.topBatters[0].playerId, 'p1');
    assert.equal(out.topBowlers[0].playerId, 'p2');
    assert.ok(out.explanation.conditionsImpact.factors.length > 0);
  });
});
