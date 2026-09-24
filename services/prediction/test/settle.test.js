import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  brierScore,
  fitPlattCalibration,
  fitWeights,
  predictedFavorite,
  summarizePerformance,
} from '../src/settle.js';

describe('predictedFavorite', () => {
  it('picks the side with probability above 0.5', () => {
    assert.equal(predictedFavorite('a', 'b', 0.62), 'a');
    assert.equal(predictedFavorite('a', 'b', 0.4), 'b');
    assert.equal(predictedFavorite('a', 'b', 0.5), null);
  });
});

describe('summarizePerformance', () => {
  it('reports accuracy and Brier score for settled pre-match runs', () => {
    const summary = summarizePerformance([
      {
        homeTeamId: 'a',
        awayTeamId: 'b',
        homeWinProb: 0.8,
        actualWinnerId: 'a',
        format: 't20',
      },
      {
        homeTeamId: 'a',
        awayTeamId: 'b',
        homeWinProb: 0.7,
        actualWinnerId: 'b',
        format: 't20',
      },
      {
        homeTeamId: 'a',
        awayTeamId: 'b',
        homeWinProb: 0.6,
        actualWinnerId: null,
        format: 'odi',
      },
    ]);
    assert.equal(summary.sampleSize, 2);
    assert.equal(summary.accuracy, 0.5);
    assert.equal(summary.byFormat[0].format, 't20');
    assert.ok(summary.brierScore > 0);
    assert.ok(Math.abs(brierScore(0.8, true) - 0.04) < 1e-10);
  });
});

describe('fitPlattCalibration', () => {
  it('recovers a positive slope when high z maps to home wins', () => {
    const rows = [];
    for (let i = 0; i < 40; i += 1) {
      const z = (i - 20) / 6;
      rows.push({ z, homeWon: z > 0 });
    }
    const fit = fitPlattCalibration(rows, { minSamples: 8 });
    assert.equal(fit.applied, true);
    assert.ok(fit.slope > 1);
    assert.equal(fit.sampleSize, 40);
  });

  it('skips when too few settled outcomes exist', () => {
    const fit = fitPlattCalibration([{ z: 1, homeWon: true }], { minSamples: 8 });
    assert.equal(fit.applied, false);
    assert.equal(fit.reason, 'insufficient_sample');
  });
});

describe('fitWeights', () => {
  const names = ['form', 'h2h', 'table', 'venue', 'toss', 'conditions', 'squad'];
  const baseFeatures = [0, 0, 0, 0, 0, 0, 0];

  it('recovers a positive form weight when form drives home wins', () => {
    const rows = [];
    for (let i = 0; i < 60; i += 1) {
      const formEdge = (i % 2 === 0 ? 1 : -1);
      const features = [...baseFeatures];
      features[0] = formEdge * 0.8;
      rows.push({ features, names, homeWon: formEdge > 0 });
    }
    const fit = fitWeights(rows, { minSamples: 20 });
    assert.equal(fit.applied, true);
    assert.ok(fit.weights.form > 0.5);
    assert.equal(fit.weights.squad, 0);
    assert.equal(fit.sampleSize, 60);
  });

  it('keeps an irrelevant feature near zero', () => {
    const rows = [];
    for (let i = 0; i < 60; i += 1) {
      const features = [...baseFeatures];
      features[2] = i % 2 === 0 ? 0.9 : -0.7;
      rows.push({ features, names, homeWon: i < 30 });
    }
    const fit = fitWeights(rows, { minSamples: 20 });
    assert.equal(fit.applied, true);
    assert.ok(Math.abs(fit.weights.table) < 0.5);
  });

  it('skips when too few settled outcomes exist', () => {
    const fit = fitWeights([{ features: baseFeatures, names, homeWon: true }], { minSamples: 20 });
    assert.equal(fit.applied, false);
    assert.equal(fit.reason, 'insufficient_sample');
  });

  it('drops rows with non-finite features', () => {
    const rows = [{ features: [NaN, 0, 0, 0, 0, 0, 0], names, homeWon: true }];
    const fit = fitWeights(rows, { minSamples: 1 });
    assert.equal(fit.applied, false);
    assert.equal(fit.reason, 'insufficient_sample');
  });
});
