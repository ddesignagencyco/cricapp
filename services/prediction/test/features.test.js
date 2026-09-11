import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectFormat,
  extractPrematchFeatures,
  extractWinnerId,
  meetingsFromHeadToHead,
} from '../src/features.js';

describe('detectFormat', () => {
  it('maps tournament names onto t20 / odi / test', () => {
    assert.equal(detectFormat('Pakistan Super League', null), 't20');
    assert.equal(detectFormat('ICC Cricket World Cup', 'ODI'), 'odi');
    assert.equal(detectFormat('The Ashes', 'Test'), 'test');
  });
});

describe('extractWinnerId', () => {
  it('reads winner_id from sport_event_status', () => {
    const id = extractWinnerId({
      sport_event_status: { winner_id: 'sr:competitor:1' },
    });
    assert.equal(id, 'sr:competitor:1');
  });
});

describe('meetingsFromHeadToHead', () => {
  it('unwraps last_meetings.results', () => {
    const meetings = meetingsFromHeadToHead({
      last_meetings: { results: [{ sport_event_status: { winner_id: 'a' } }] },
    });
    assert.equal(meetings.length, 1);
  });
});

function stubQuery(handlers) {
  return async (sql, params) => {
    for (const handler of handlers) {
      if (handler.match(sql, params)) return handler.rows;
    }
    return { rows: [] };
  };
}

describe('extractPrematchFeatures', () => {
  it('builds form, H2H, table and toss fields from sports tables', async () => {
    const query = stubQuery([
      {
        match: (sql) => sql.includes('FROM matches'),
        rows: {
          rows: [
            {
              match_id: 'sr:match:1',
              status: 'upcoming',
              teams: ['LQ', 'KK'],
              team_names: ['Lahore Qalandars', 'Karachi Kings'],
              tournament: 'Pakistan Super League',
              venue: 'Gaddafi Stadium Lahore',
              scheduled: '2026-09-12T14:00:00Z',
              current_innings: null,
              last_event: { type: 'none', runs: 0, over: 0 },
              display_score: null,
              match_status: null,
            },
          ],
        },
      },
      {
        match: (sql) => sql.includes('FROM sport_event_records') && sql.includes('event_id = $1'),
        rows: {
          rows: [
            {
              payload: {
                sport_event: {
                  competitors: [
                    { id: 'sr:competitor:1', qualifier: 'home', name: 'Lahore Qalandars' },
                    { id: 'sr:competitor:2', qualifier: 'away', name: 'Karachi Kings' },
                  ],
                },
                sport_event_status: { toss_won_by: 'sr:competitor:1', toss_decision: 'bat' },
              },
            },
          ],
        },
      },
      {
        match: (sql) => sql.includes('FROM teams'),
        rows: {
          rows: [
            { id: 'sr:competitor:1', name: 'Lahore Qalandars', abbr: 'LQ', country: 'Pakistan' },
            { id: 'sr:competitor:2', name: 'Karachi Kings', abbr: 'KK', country: 'Pakistan' },
          ],
        },
      },
      {
        match: (sql, params) => sql.includes("kind = 'team_results'") && params[0] === 'sr:competitor:1',
        rows: {
          rows: [
            { payload: { sport_event_status: { winner_id: 'sr:competitor:1' } } },
            { payload: { sport_event_status: { winner_id: 'sr:competitor:1' } } },
            { payload: { sport_event_status: { winner_id: 'sr:competitor:9' } } },
          ],
        },
      },
      {
        match: (sql, params) => sql.includes("kind = 'team_results'") && params[0] === 'sr:competitor:2',
        rows: {
          rows: [
            { payload: { sport_event_status: { winner_id: 'sr:competitor:8' } } },
            { payload: { sport_event_status: { winner_id: 'sr:competitor:2' } } },
          ],
        },
      },
      {
        match: (sql) => sql.includes('FROM head_to_head'),
        rows: {
          rows: [
            {
              payload: {
                last_meetings: {
                  results: [
                    { sport_event_status: { winner_id: 'sr:competitor:1' } },
                    { sport_event_status: { winner_id: 'sr:competitor:1' } },
                    { sport_event_status: { winner_id: 'sr:competitor:2' } },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        match: (sql) => sql.includes('FROM psl_standings'),
        rows: {
          rows: [
            { season_id: 'sr:season:140552', team_id: 'sr:competitor:1', points: 14, net_run_rate: 1.2 },
            { season_id: 'sr:season:140552', team_id: 'sr:competitor:2', points: 8, net_run_rate: -0.4 },
          ],
        },
      },
      {
        match: (sql) => sql.includes('FROM players'),
        rows: { rows: [{ n: 15 }] },
      },
      {
        match: (sql) => sql.includes('FROM team_profiles'),
        rows: { rows: [] },
      },
    ]);

    const snapshot = await extractPrematchFeatures('sr:match:1', { query, redis: null });
    assert.equal(snapshot.homeTeamId, 'sr:competitor:1');
    assert.equal(snapshot.format, 't20');
    assert.ok(snapshot.form.home > snapshot.form.away);
    assert.ok(snapshot.h2h.edge > 0);
    assert.equal(snapshot.table.used, true);
    assert.equal(snapshot.toss.edge, 1);
    assert.equal(snapshot.venueEdge, 1);
  });
});
