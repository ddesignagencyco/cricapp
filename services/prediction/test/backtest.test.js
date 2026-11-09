import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, holdoutReport, ratingsAsOf, replayHistory } from '../src/backtest.js';
import { settledMatchesFromRows } from '../src/ratings.js';

const A = 'cb:team:1';
const B = 'cb:team:2';
const C = 'cb:team:3';

/** A finished game as the ratings loader reads it: a row with the stored result payload. */
function row(id, scheduled, home, away, winnerName) {
  return {
    match_id: id,
    tournament: 'Sample T20 League',
    match_status: 'ended',
    scheduled,
    payload: {
      sport_event: {
        competitors: [
          { id: home, name: home === A ? 'Alpha' : home === B ? 'Beta' : 'Gamma', qualifier: 'home' },
          { id: away, name: away === A ? 'Alpha' : away === B ? 'Beta' : 'Gamma', qualifier: 'away' },
        ],
      },
      sport_event_status: { match_result_text: winnerName ? `${winnerName} won by 5 runs` : 'Match abandoned' },
    },
  };
}

const rows = [
  row('m1', '2026-01-01T10:00:00Z', A, B, 'Alpha'),
  row('m2', '2026-01-02T10:00:00Z', A, C, 'Gamma'),
  row('m3', '2026-01-03T10:00:00Z', B, C, null), // no result: nothing to learn from
  row('m4', '2026-01-04T10:00:00Z', A, B, 'Beta'),
];

describe('ratingsAsOf', () => {
  it('reflects only the games before the one being predicted', () => {
    const settled = settledMatchesFromRows(rows);
    const beforeM1 = ratingsAsOf(settled.slice(0, 0));
    assert.equal(beforeM1(A, 't20'), null, 'nothing is known before the first game');

    const beforeM2 = ratingsAsOf(settled.slice(0, 1)); // only m1: Alpha beat Beta
    assert.ok(beforeM2(A, 't20').elo > 1500 && beforeM2(B, 't20').elo < 1500);
    assert.equal(beforeM2(C, 't20'), null, 'Gamma has not played yet');

    const beforeM4 = ratingsAsOf(settled.slice(0, 3));
    assert.ok(beforeM4(C, 't20').played >= 1);
  });
});

describe('replayHistory', () => {
  const run = async (overrides = {}) => {
    const seen = [];
    const persisted = [];
    const result = await replayHistory({
      query: async () => ({ rows: [] }),
      deps: {
        rows,
        already: new Set(),
        extract: async (matchId, { asOf, ratings }) => {
          // capture what the model could see: the ratings a leaky replay would get wrong
          seen.push({ matchId, asOf, alpha: ratings(A, 't20')?.played ?? 0, gamma: ratings(C, 't20')?.played ?? 0 });
          return {
            matchId,
            format: 't20',
            form: { home: 0.6, away: 0.4, homeN: 3, awayN: 3 },
            h2h: { edge: 0, meetings: 0 },
            elo: ratings(A, 't20') && ratings(B, 't20') ? { edge: 0.2 } : null,
            backtest: true,
          };
        },
        persist: async (_q, args) => persisted.push(args),
        ...overrides,
      },
      ...overrides.options,
    });
    return { result, seen, persisted };
  };

  it('gives each match only the history before it', async () => {
    const { seen } = await run();
    const m4 = seen.find((s) => s.matchId === 'm4');
    assert.deepEqual({ alpha: m4.alpha, gamma: m4.gamma }, { alpha: 2, gamma: 1 }, 'm1 and m2 are visible, m3 had no result');
    const m1 = seen.find((s) => s.matchId === 'm1');
    assert.equal(m1.alpha, 0, 'the first game sees nothing');
    assert.equal(m1.asOf, '2026-01-01T10:00:00Z');
  });

  it('predicts decided matches in date order, skips undecided ones, and backdates each run', async () => {
    const { result, persisted } = await run();
    assert.deepEqual(result.points.map((p) => p.matchId), ['m1', 'm2', 'm4']);
    assert.equal(result.skipped.undecided, 1);
    assert.deepEqual(persisted.map((p) => p.matchId), ['m1', 'm2', 'm4']);
    for (const p of persisted) {
      assert.equal(p.snapshot.calibration.source, 'backtest');
      assert.equal(p.snapshot.weights.form, 1.4, 'the raw default weights, not ones learned from this data');
    }
    assert.equal(persisted[0].createdAt, '2026-01-01T09:00:00.000Z');
    assert.deepEqual(result.points.map((p) => p.homeWon), [true, false, false]);
  });

  it('writes nothing in a dry run and leaves already-predicted matches alone', async () => {
    const dry = await run({ options: { dryRun: true } });
    assert.equal(dry.persisted.length, 0);
    assert.equal(dry.result.points.length, 3);
    const { result } = await run({ already: new Set(['m2']) });
    assert.deepEqual(result.points.map((p) => p.matchId), ['m1', 'm4']);
    assert.equal(result.skipped.alreadyPredicted, 1);
  });
});

describe('evaluate / holdoutReport', () => {
  it('scores probabilities against outcomes', () => {
    const r = evaluate([{ prob: 0.8, homeWon: true }, { prob: 0.8, homeWon: false }, { prob: 0.5, homeWon: true }]);
    assert.equal(r.n, 3);
    assert.equal(r.accuracy, 0.3333); // a 50% forecast is never counted as right
    assert.equal(r.brier, 0.31); // (0.04 + 0.64 + 0.25) / 3
    assert.deepEqual(evaluate([]), { n: 0, brier: null, accuracy: null });
  });

  it('judges on the newest slice only, after fitting on the older one', () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      scheduled: `2026-01-${String(1 + (i % 28)).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`,
      prob: i % 2 ? 0.7 : 0.3,
      z: i % 2 ? 0.8 : -0.8,
      edges: { form: i % 2 ? 0.3 : -0.3, h2h: 0, table: 0, venue: 0, toss: 0, conditions: 0, xi: 0, elo: 0 },
      homeWon: i % 2 === 1,
    }));
    const report = holdoutReport(points, { holdoutShare: 0.3 });
    assert.equal(report.train, 70);
    assert.equal(report.test, 30);
    assert.equal(report.coinFlip.brier, 0.25);
    assert.equal(report.coinFlip.accuracy, null);
    assert.ok(report.rawModel.accuracy > 0.9, 'a perfectly informative signal is recognised');
  });
});
