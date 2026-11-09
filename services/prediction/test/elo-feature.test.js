import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eloReliability, eloEdge } from '../src/features.js';
import { PREMATCH_WEIGHTS, FEATURE_NAMES, featureVectorFromSnapshot, scorePrematch } from '../src/prematch.js';
import { defaultPrematchWeights, edgesFromExplanation, fitPrematchWeights, logitFromEdges } from '../src/weights.js';

const base = {
  format: 't20',
  form: { home: 0.5, away: 0.5, homeN: 5, awayN: 5 },
  h2h: { edge: 0, meetings: 0 },
  table: { used: false },
  toss: { edge: 0 },
  parScore: 160,
};

describe('Elo as a prematch edge', () => {
  it('trusts a rating gap only as far as both sides have played', () => {
    assert.equal(eloReliability(0, 10), 0, 'a side that has never been rated says nothing');
    assert.equal(eloReliability(3, 12), 0.5);
    assert.equal(eloReliability(6, 40), 1);
    assert.equal(eloReliability(100, 100), 1, 'never more than full weight');
    assert.equal(eloReliability(undefined, 5), 0);
  });

  it('moves the forecast toward the stronger side, and is absent without ratings', () => {
    const level = scorePrematch({ ...base, elo: null });
    const favoured = scorePrematch({ ...base, elo: { edge: eloEdge(1600, 1400) } });
    const underdog = scorePrematch({ ...base, elo: { edge: eloEdge(1400, 1600) } });
    assert.ok(favoured.homeWinProb > level.homeWinProb && level.homeWinProb > underdog.homeWinProb);
    assert.equal(level.explanation.eloEdge, 0);
    const attribution = favoured.explanation.factorAttributions.find((f) => f.factor === 'elo');
    assert.ok(attribution.contribution > 0);
  });

  it('is part of the feature vector, the default weights and the learned-edge keys', () => {
    assert.ok(FEATURE_NAMES.includes('elo'));
    assert.equal(defaultPrematchWeights().elo, PREMATCH_WEIGHTS.elo);
    const vector = featureVectorFromSnapshot({ ...base, elo: { edge: 0.4 } });
    assert.equal(vector.values.length, vector.names.length);
    assert.equal(vector.values[vector.names.indexOf('elo')], 0.4);
    const edges = edgesFromExplanation({ eloEdge: 0.3 }, {});
    assert.equal(edges.elo, 0.3);
    assert.ok(logitFromEdges({ elo: 1 }, { elo: 0.9 }) === 0.9);
  });

  it('a snapshot without an elo block still scores (older stored snapshots)', () => {
    const { elo: _ignored, ...legacy } = { ...base, elo: null };
    assert.doesNotThrow(() => scorePrematch(legacy));
  });

  it('weight fitting learns a useful Elo weight and keeps it inside its bounds', () => {
    const points = Array.from({ length: 200 }, (_, i) => {
      const edge = ((i % 20) - 10) / 10; // -1 … 0.9
      return { edges: { form: 0, h2h: 0, table: 0, venue: 0, toss: 0, conditions: 0, xi: 0, elo: edge }, homeWon: edge + (i % 7 - 3) / 10 > 0 };
    });
    const fit = fitPrematchWeights(points, { minSamples: 40 });
    assert.equal(fit.applied, true);
    assert.ok(fit.weights.elo > PREMATCH_WEIGHTS.elo, `elo weight ${fit.weights.elo} should rise when elo predicts outcomes`);
    assert.ok(fit.weights.elo <= 2.5);
  });
});
