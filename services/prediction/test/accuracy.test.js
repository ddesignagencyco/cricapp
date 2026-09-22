import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resourcesRemainingFromTable, resourceTable } from '../src/resources.js';
import { fitPrematchWeights, defaultPrematchWeights } from '../src/weights.js';
import { clearParCache, resolveParScore } from '../src/pars.js';
import { tossDecisionEdge } from '../src/features.js';

describe('resourcesRemainingFromTable', () => {
  it('starts near full resources and drops with overs/wickets', () => {
    const start = resourcesRemainingFromTable({
      format: 't20',
      remainingBalls: 120,
      allottedBalls: 120,
      wicketsLost: 0,
    });
    const mid = resourcesRemainingFromTable({
      format: 't20',
      remainingBalls: 60,
      allottedBalls: 120,
      wicketsLost: 0,
    });
    const afterWicket = resourcesRemainingFromTable({
      format: 't20',
      remainingBalls: 60,
      allottedBalls: 120,
      wicketsLost: 4,
    });
    assert.ok(start > 0.95);
    assert.ok(mid < start);
    assert.ok(afterWicket < mid);
    assert.equal(resourceTable('odi').length, 51);
  });
});

describe('fitPrematchWeights', () => {
  it('requires a minimum settled sample', () => {
    const fit = fitPrematchWeights([{ homeWon: true, edges: defaultPrematchWeights() }]);
    assert.equal(fit.applied, false);
  });

  it('fits stronger form weight when form separates winners', () => {
    const rows = [];
    for (let i = 0; i < 60; i += 1) {
      const form = i < 30 ? 0.4 : -0.4;
      rows.push({
        homeWon: form > 0,
        edges: {
          form,
          h2h: 0,
          table: 0,
          venue: 0,
          toss: 0,
          conditions: 0,
          xi: 0,
        },
      });
    }
    const fit = fitPrematchWeights(rows, { minSamples: 40 });
    assert.equal(fit.applied, true);
    assert.ok(fit.weights.form > fit.weights.venue);
  });
});

describe('resolveParScore', () => {
  it('falls back to format default without venue history', async () => {
    clearParCache();
    const par = await resolveParScore(async () => ({ rows: [] }), {
      venue: 'Unknown Ground',
      format: 't20',
    });
    assert.equal(par.par, 160);
    assert.equal(par.source, 'format_default');
  });

  it('uses venue history when enough samples exist', async () => {
    clearParCache();
    const par = await resolveParScore(
      async () => ({
        rows: Array.from({ length: 8 }, () => ({
          venue: 'Gaddafi Stadium, Lahore',
          tournament: 'PSL',
          match_status: 'T20',
          current_innings: { runs: 180, wickets: 5, overs: 20 },
          display_score: '180/5',
        })),
      }),
      { venue: 'Gaddafi Stadium, Lahore', format: 't20' },
    );
    assert.equal(par.par, 180);
    assert.equal(par.source, 'venue_history');
  });
});

describe('tossDecisionEdge', () => {
  it('amplifies bowl-first under dew and bat-first on dry days', () => {
    const dew = tossDecisionEdge({
      tossWonBy: 'home',
      decision: 'bowl',
      homeTeamId: 'home',
      awayTeamId: 'away',
      conditions: { weather: 'dew expected', dayNight: true },
    });
    const dry = tossDecisionEdge({
      tossWonBy: 'home',
      decision: 'bat',
      homeTeamId: 'home',
      awayTeamId: 'away',
      conditions: { pitch: 'dry batting surface', dayNight: false },
    });
    assert.ok(dew > 1);
    assert.ok(dry > 1);
  });
});
