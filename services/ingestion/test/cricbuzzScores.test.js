import { test } from 'node:test';
import assert from 'node:assert/strict';

import { periodsFromMatchScore } from '../src/providers/cricbuzz.js';

test('periodsFromMatchScore turns list innings scores into ordered period scores', () => {
  const periods = periodsFromMatchScore({
    team1Score: { inngs1: { inningsId: 1, runs: 180, wickets: 8, overs: 19.6 } },
    team2Score: { inngs1: { inningsId: 2, runs: 170, wickets: 7, overs: 19.6 } },
  });
  assert.deepEqual(periods, [
    { number: 1, home_score: 180, home_wickets: 8, display_overs: '19.6' },
    { number: 2, away_score: 170, away_wickets: 7, display_overs: '19.6' },
  ]);
  assert.deepEqual(periodsFromMatchScore(undefined), []);
  assert.equal(periodsFromMatchScore({ team1Score: { inngs1: { runs: 100 } } })[0].home_wickets, undefined);
});
