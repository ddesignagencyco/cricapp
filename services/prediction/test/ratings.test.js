import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEloRatings,
  computeTossTrends,
  eloEdge,
  marginMultiplier,
  tossMagnitude,
  venueHistoryEdge,
  settledMatchesFromRows,
} from '../src/ratings.js';

describe('marginMultiplier', () => {
  it('returns 1 for zero margin', () => {
    assert.equal(marginMultiplier(0), 1);
  });
  it('increases with margin, capped at 2', () => {
    assert.ok(marginMultiplier(20) > 1 && marginMultiplier(20) < 2);
    assert.equal(marginMultiplier(1000), 2);
  });
});

describe('eloEdge', () => {
  it('returns small positive edge for equal ratings due to home advantage', () => {
    assert.ok(eloEdge(1500, 1500) > 0.1 && eloEdge(1500, 1500) < 0.2);
  });
  it('gives larger positive edge to higher-rated team', () => {
    assert.ok(eloEdge(1600, 1400) > 0.6);
  });
  it('gives negative edge to lower-rated team with home advantage partially offsetting', () => {
    const e = eloEdge(1400, 1600);
    assert.ok(e < 0 && e > -0.5);
  });
  it('is not symmetric due to home advantage', () => {
    assert.notEqual(eloEdge(1600, 1400), -eloEdge(1400, 1600));
  });
});

describe('tossMagnitude', () => {
  it('returns 1 when insufficient matches', () => {
    assert.equal(tossMagnitude(0.7, 10), 1);
  });
  it('scales up when toss winner wins more than 50%', () => {
    assert.equal(tossMagnitude(0.6, 20), 0.75);
    assert.equal(tossMagnitude(0.7, 20), 1);
  });
  it('scales down when toss winner wins less than 50%', () => {
    assert.equal(tossMagnitude(0.4, 20), 0.25);
  });
  it('clamps between 0.25 and 1', () => {
    assert.equal(tossMagnitude(0.9, 100), 1);
    assert.equal(tossMagnitude(0.1, 100), 0.25);
  });
});

describe('venueHistoryEdge', () => {
  it('returns used=false when either team has too few matches', () => {
    const r = venueHistoryEdge({ homeWins: 3, homeN: 3, awayWins: 1, awayN: 1 });
    assert.equal(r.used, false);
    assert.equal(r.edge, 0);
  });
  it('computes edge from win rates', () => {
    const r = venueHistoryEdge({ homeWins: 6, homeN: 8, awayWins: 2, awayN: 8 });
    assert.equal(r.used, true);
    assert.ok(r.edge > 0);
  });
  it('shrinks edge with small total sample', () => {
    const rSmall = venueHistoryEdge({ homeWins: 2, homeN: 2, awayWins: 0, awayN: 2 });
    const rLarge = venueHistoryEdge({ homeWins: 12, homeN: 12, awayWins: 0, awayN: 12 });
    assert.ok(rLarge.edge > rSmall.edge);
  });
});

describe('computeEloRatings', () => {
  const base = (overrides = {}) => ({
    homeTeamId: 'home',
    awayTeamId: 'away',
    format: 't20',
    margin: 0,
    homeWon: true,
    ...overrides,
  });

  it('increases winner rating and decreases loser', () => {
    const settled = [base()];
    const ratings = computeEloRatings(settled);
    const home = ratings.find((r) => r.teamId === 'home');
    const away = ratings.find((r) => r.teamId === 'away');
    assert.ok(home.elo > 1500);
    assert.ok(away.elo < 1500);
  });

  it('margin multiplier increases update magnitude', () => {
    const noMargin = computeEloRatings([base({ margin: 0 })]);
    const highMargin = computeEloRatings([base({ margin: 80 })]);
    const homeNo = noMargin.find((r) => r.teamId === 'home');
    const homeHi = highMargin.find((r) => r.teamId === 'home');
    assert.ok(homeHi.elo > homeNo.elo);
  });

  it('is per-format: separate ratings for t20/odi', () => {
    const settled = [
      base({ format: 't20', homeWon: true }),
      base({ format: 'odi', homeWon: false }),
    ];
    const ratings = computeEloRatings(settled);
    const t20Home = ratings.find((r) => r.teamId === 'home' && r.format === 't20');
    const odiHome = ratings.find((r) => r.teamId === 'home' && r.format === 'odi');
    assert.ok(t20Home.elo > 1500);
    assert.ok(odiHome.elo < 1500);
  });
});

describe('computeTossTrends', () => {
  it('aggregates toss winner win rate per format and globally', () => {
    const settled = [
      { homeTeamId: 'h', awayTeamId: 'a', format: 't20', tossWonBy: 'h', winnerId: 'h', tossDecision: 'bat', margin: 0, homeWon: true, scheduled: '2024-01-01' },
      { homeTeamId: 'h', awayTeamId: 'a', format: 't20', tossWonBy: 'a', winnerId: 'a', tossDecision: 'bat', margin: 0, homeWon: false, scheduled: '2024-01-02' },
      { homeTeamId: 'h', awayTeamId: 'a', format: 'odi', tossWonBy: 'h', winnerId: 'h', tossDecision: 'bat', margin: 0, homeWon: true, scheduled: '2024-01-03' },
    ];
    const trends = computeTossTrends(settled);
    const global = trends.find((t) => t.format === '*');
    const t20 = trends.find((t) => t.format === 't20');
    const odi = trends.find((t) => t.format === 'odi');
    assert.ok(global);
    assert.equal(t20.matches, 2);
    assert.equal(odi.matches, 1);
    assert.equal(t20.tossWinnerWinRate, 1.0);
  });
});

describe('settledMatchesFromRows', () => {
  it('parses payload and extracts home/away/winner', () => {
    const rows = [{
      match_id: 'm1',
      tournament: 'Pakistan Super League',
      match_status: 'completed',
      scheduled: '2024-01-01',
      payload: {
        sport_event: { competitors: [
          { id: 'sr:c1', qualifier: 'home' },
          { id: 'sr:c2', qualifier: 'away' },
        ]},
        sport_event_status: { winner_id: 'sr:c1', toss_won_by: 'sr:c1', toss_decision: 'bat', period_scores: [{ type: 'inning', home_score: 150, away_score: 120 }] },
      },
    }];
    const settled = settledMatchesFromRows(rows);
    assert.equal(settled.length, 1);
    assert.equal(settled[0].homeTeamId, 'sr:c1');
    assert.equal(settled[0].awayTeamId, 'sr:c2');
    assert.equal(settled[0].winnerId, 'sr:c1');
    assert.equal(settled[0].homeWon, true);
    assert.equal(settled[0].format, 't20');
  });
  it('ignores rows without competitors or winner', () => {
    const rows = [{
      match_id: 'm1',
      tournament: 'Unknown League',
      match_status: 'completed',
      scheduled: '2024-01-01',
      payload: { sport_event: { competitors: [] }, sport_event_status: {} },
    }];
    const settled = settledMatchesFromRows(rows);
    assert.equal(settled.length, 0);
  });
});