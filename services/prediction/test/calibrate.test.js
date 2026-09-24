import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recalibratePrematch, refitPrematchWeights, rescaleWeights } from '../src/calibrate.js';

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

describe('rescaleWeights', () => {
  function featureRows(count) {
    const rows = [];
    for (let i = 0; i < count; i += 1) {
      const formValue = (i % 2 === 0 ? 1 : -1) * 0.8;
      rows.push({
        snapshot: {
          homeTeamId: 'home',
          awayTeamId: 'away',
          format: 't20',
          form: { home: formValue > 0 ? 0.9 : 0.1, away: formValue > 0 ? 0.1 : 0.9 },
          h2h: { edge: 0 },
          table: { used: false, edge: 0 },
          venueEdge: 0,
          toss: { edge: 0 },
          conditions: null,
          squad: { used: false, edge: 0 },
        },
        payload: { sport_event_status: { winner_id: formValue > 0 ? 'home' : 'away' } },
      });
    }
    return rows;
  }

  function weightStub(rows, existing = []) {
    const calls = [];
    const query = async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('FROM matches') && sql.includes('prediction_features')) return { rows };
      if (sql.includes('FROM prediction_model_weights') && sql.includes('SELECT weights')) return { rows: existing };
      if (sql.includes('SELECT DISTINCT ON (format)')) return { rows: [] };
      if (sql.includes('INSERT INTO prediction_model_weights')) return { rows: [] };
      return { rows: [] };
    };
    return { query, calls };
  }

  it('fits and persists per-format weights when enough settled vectors exist', async () => {
    const { query, calls } = weightStub(featureRows(40));
    const result = await rescaleWeights(query);
    assert.equal(result.applied, true);
    assert.equal(result.refits.length, 1);
    assert.equal(result.refits[0].format, 't20');
    assert.equal(result.refits[0].applied, true);
    assert.ok(result.refits[0].weights.form > 0.5);
    assert.ok(calls.some((c) => c.sql.includes('INSERT INTO prediction_model_weights')));
  });

  it('skips when sample is too small', async () => {
    const { query } = weightStub(featureRows(5));
    const result = await rescaleWeights(query);
    assert.equal(result.applied, false);
    assert.equal(result.refits.length, 0);
  });

  it('does not persist when the fit is unchanged from the latest row', async () => {
    const rows = featureRows(40);
    const first = await rescaleWeights(weightStub(rows).query);
    assert.equal(first.applied, true);
    const fit = first.refits[0];
    const existing = [
      {
        weights: fit.weights,
        intercept: fit.intercept,
        sample_size: fit.sampleSize,
      },
    ];
    const { query, calls } = weightStub(rows, existing);
    const result = await rescaleWeights(query);
    assert.equal(result.refits[0].applied, false);
    assert.equal(result.refits[0].reason, 'unchanged');
    assert.ok(!calls.some((c) => c.sql.includes('INSERT INTO prediction_model_weights')));
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
