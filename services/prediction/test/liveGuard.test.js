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
