import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { brierScore, predictedFavorite, summarizePerformance } from '../src/settle.js';

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
