import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computePerformanceStats, snapshotPerformance } from '../src/performance.js';

function row({ homeWinProb, confidence, format = 't20', homeWon = true }) {
  return {
    home_win_prob: homeWinProb,
    confidence,
    snapshot: {
      homeTeamId: 'home',
      awayTeamId: 'away',
      format,
    },
    payload: { sport_event_status: { winner_id: homeWon ? 'home' : 'away' } },
  };
}

describe('computePerformanceStats', () => {
  it('computes accuracy, brier, ECE, and per-format/per-band buckets', () => {
    const stats = computePerformanceStats(
      [
        row({ homeWinProb: 0.8, confidence: 0.8, format: 't20', homeWon: true }),
        row({ homeWinProb: 0.6, confidence: 0.6, format: 't20', homeWon: false }),
        row({ homeWinProb: 0.7, confidence: 0.7, format: 'odi', homeWon: true }),
      ],
      { bins: 10 },
    );
    assert.equal(stats.sampleSize, 3);
    assert.equal(stats.accuracy, 0.6667);
    assert.ok(stats.brierScore > 0);
    assert.ok(Number.isFinite(stats.expectedCalibrationError));
    assert.equal(stats.byFormat.find((b) => b.format === 't20').sampleSize, 2);
    assert.equal(stats.byFormat.find((b) => b.format === 'odi').sampleSize, 1);
    assert.equal(stats.byConfidenceBand.find((b) => b.band === 'high').sampleSize, 1);
    assert.equal(stats.byConfidenceBand.find((b) => b.band === 'medium').sampleSize, 2);
  });

  it('skips rows that cannot be resolved to a winner', () => {
    const stats = computePerformanceStats([
      { ...row({ homeWinProb: 0.7 }), payload: { sport_event_status: {} } },
    ]);
    assert.equal(stats, null);
  });

  it('returns null for empty input', () => {
    assert.equal(computePerformanceStats([]), null);
  });
});

describe('snapshotPerformance', () => {
  it('records a snapshot when enough settled runs exist', async () => {
    const calls = [];
    function stubQuery(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FROM prediction_runs')) {
        return {
          rows: [
            row({ homeWinProb: 0.8, confidence: 0.8, homeWon: true }),
            row({ homeWinProb: 0.6, confidence: 0.6, homeWon: false }),
          ],
        };
      }
      if (sql.includes('INSERT INTO prediction_performance_snapshots')) return { rows: [] };
      return { rows: [] };
    }
    const result = await snapshotPerformance(stubQuery, {
      modelVersion: 'prematch-logit-v2',
      stage: 'pre_match',
    });
    assert.equal(result.applied, true);
    assert.ok(result.id);
    assert.equal(result.stats.sampleSize, 2);
    assert.ok(calls.some((c) => c.sql.includes('INSERT INTO prediction_performance_snapshots')));
  });

  it('skips when no settled runs resolve', async () => {
    function stubQuery() {
      return { rows: [] };
    }
    const result = await snapshotPerformance(stubQuery, {
      modelVersion: 'prematch-logit-v2',
      stage: 'pre_match',
    });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'insufficient_sample');
  });
});

describe('settledRunsQuery', () => {
  it('excludes decided lock live runs', async () => {
    const { settledRunsQuery } = await import('../src/performance.js');
    const sql = settledRunsQuery({ stage: 'live' });
    assert.match(sql, /match_decided/);
    const preSql = settledRunsQuery({ stage: 'pre_match' });
    assert.doesNotMatch(preSql, /match_decided/);
  });
});