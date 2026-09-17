import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recalibratePrematch } from '../src/calibrate.js';

function stubQuery(outcomes) {
  return async (sql) => {
    if (sql.includes('FROM matches')) {
      return {
        rows: outcomes.map((row) => ({
          home_win_prob: row.homeWinProb,
          explanation: { z: row.z },
          snapshot: { homeTeamId: 'home', awayTeamId: 'away' },
          payload: { sport_event_status: { winner_id: row.homeWon ? 'home' : 'away' } },
        })),
      };
    }
    if (sql.includes('FROM prediction_calibrations') && sql.includes('SELECT')) {
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO prediction_calibrations')) {
      return { rows: [] };
    }
    return { rows: [] };
  };
}

describe('recalibratePrematch', () => {
  it('fits and persists when enough settled outcomes exist', async () => {
    const outcomes = [];
    for (let i = 0; i < 20; i += 1) {
      const z = (i - 10) / 4;
      outcomes.push({ z, homeWon: z > 0, homeWinProb: z > 0 ? 0.8 : 0.2 });
    }
    const result = await recalibratePrematch(stubQuery(outcomes));
    assert.equal(result.applied, true);
    assert.ok(result.slope > 0);
    assert.ok(result.id);
  });

  it('skips when settled sample is too small', async () => {
    const result = await recalibratePrematch(
      stubQuery([{ z: 1, homeWon: true, homeWinProb: 0.8 }]),
    );
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'insufficient_sample');
  });
});
