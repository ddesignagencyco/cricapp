import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recalibratePrematch, refitPrematchWeights } from '../src/calibrate.js';

function stubQuery(outcomes) {
  return async (sql, params = []) => {
    if (sql.includes('FROM matches') && sql.includes('prediction_runs')) {
      return {
        rows: outcomes.map((row) => ({
          home_win_prob: row.homeWinProb,
          explanation: {
            z: row.z,
            formEdge: row.formEdge ?? row.z,
            h2hEdge: row.h2hEdge ?? 0,
            tableEdge: 0,
            venueEdge: 0,
            tossEdge: 0,
            xiEdge: 0,
            conditionsImpact: { winEdge: 0 },
          },
          snapshot: {
            homeTeamId: 'home',
            awayTeamId: 'away',
            format: row.format || 't20',
          },
          payload: { sport_event_status: { winner_id: row.homeWon ? 'home' : 'away' } },
          tournament: 'PSL',
          match_status: 'T20',
        })),
      };
    }
    if (sql.includes('FROM prediction_calibrations') && sql.includes('SELECT')) {
      return { rows: [] };
    }
    if (sql.includes('INSERT INTO prediction_calibrations')) {
      return { rows: [{ id: params[0] }] };
    }
    return { rows: [] };
  };
}

function makeOutcomes(n) {
  const outcomes = [];
  for (let i = 0; i < n; i += 1) {
    const z = (i - n / 2) / 5;
    outcomes.push({
      z,
      homeWon: z > 0,
      homeWinProb: z > 0 ? 0.8 : 0.2,
      formEdge: z,
      format: i % 2 === 0 ? 't20' : 'odi',
    });
  }
  return outcomes;
}

describe('recalibratePrematch', () => {
  it('fits and persists when enough settled outcomes exist', async () => {
    const result = await recalibratePrematch(stubQuery(makeOutcomes(50)));
    assert.equal(result.applied, true);
    assert.ok(result.slope > 0);
    assert.ok(result.id);
  });

  it('skips when settled sample is too small', async () => {
    const result = await recalibratePrematch(
      stubQuery([{ z: 1, homeWon: true, homeWinProb: 0.8, formEdge: 1 }]),
    );
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'insufficient_sample');
  });
});

describe('refitPrematchWeights', () => {
  it('learns weights from settled edge history', async () => {
    const result = await refitPrematchWeights(stubQuery(makeOutcomes(50)));
    assert.equal(result.applied, true);
    assert.ok(result.weights.form > 0);
    assert.ok(result.id);
  });
});
