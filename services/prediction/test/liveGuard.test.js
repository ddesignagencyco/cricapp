import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decidedWinProb, shouldSkipLivePrediction } from '../src/liveGuard.js';

describe('shouldSkipLivePrediction', () => {
  it('locks when chase side is all out below target', () => {
    const reason = shouldSkipLivePrediction({
      status: 'live',
      currentInning: 2,
      currentInnings: { battingTeam: 'SRI', runs: 0, wickets: 0, overs: 15.4 },
      teamScores: {
        home: { score: '216/3' },
        away: { score: '69/10' },
      },
    });
    assert.ok(reason === 'stale_innings' || reason === 'chase_over');
    const decided = decidedWinProb({
      teamScores: {
        home: { score: '216/3' },
        away: { score: '69/10' },
      },
    });
    assert.deepEqual(decided, { homeWinProb: 1, awayWinProb: 0 });
  });
});

describe('Test matches', () => {
  it('skips the live model for the test format', () => {
    assert.equal(shouldSkipLivePrediction({ format: 'test', status: 'live', currentInning: 1, currentInnings: { runs: 120, wickets: 3 } }), 'test_format');
  });

  it('does not lock a Test at 100/0 after a first-innings all out', () => {
    assert.equal(
      decidedWinProb({ format: 'test', teamScores: { home: { score: '300/10' }, away: { score: '150/10' } } }),
      null,
    );
  });

  it('does not treat a suspended match as decided', () => {
    assert.equal(shouldSkipLivePrediction({ format: 't20', status: 'live', matchStatus: 'suspended', currentInning: 1, currentInnings: { runs: 40, wickets: 1 } }), null);
  });
});
