process.env.SPORTRADAR_QPS = '1000';
process.env.LIVE_TIMELINE_DELTAS = 'false';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, shutdown as shutdownDb } from '../src/db.js';
import redis, { redisKeys, shutdown as shutdownRedis } from '../src/redis.js';
import { pollOnce } from '../src/poll.js';
import { saveMatchTimeline, saveSportEventRecords, staleUpcomingIds } from '../src/store.js';
import { refreshStaleUpcomingMatch } from '../src/refSync.js';

const TEST_MATCH_ID = 'sr:match:int-99999';
const STALE_MATCH_ID = 'sr:match:int-stale-99999';
const POSTPONED_MATCH_ID = 'sr:match:int-postponed-99999';

function staleSummaryPayload() {
  return {
    sport_event: {
      id: STALE_MATCH_ID,
      status: 'closed',
      scheduled: '2026-10-01T10:00:00Z',
      tournament: { id: 'sr:tournament:test', name: 'Test Tournament' },
      venue: { name: 'Test Ground' },
      competitors: [
        { id: 'sr:team:a', name: 'Team A', abbreviation: 'TMA', qualifier: 'home' },
        { id: 'sr:team:b', name: 'Team B', abbreviation: 'TMB', qualifier: 'away' },
      ],
    },
    sport_event_status: {
      status: 'closed',
      match_status: 'ended',
      display_score: '180/4',
      match_result_text: 'Team A won by 20 runs',
      winner_id: 'sr:team:a',
      period_scores: [
        { home_score: 180, home_wickets: 4, away_score: 160, away_wickets: 10, display_overs: 20 },
      ],
    },
  };
}

function postponedSummaryPayload() {
  const summary = staleSummaryPayload();
  return {
    ...summary,
    sport_event: {
      ...summary.sport_event,
      id: POSTPONED_MATCH_ID,
      status: 'not_started',
      scheduled: '2026-10-05T10:00:00Z',
    },
    sport_event_status: { status: 'not_started', match_status: 'scheduled' },
  };
}

function mockFetch() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    const path = u.pathname;

    if (path.includes('/schedules/live/schedule.json')) {
      return Response.json({
        sport_events: [
          { id: TEST_MATCH_ID, status: 'live', scheduled: '2026-09-09T10:00:00Z' },
        ],
      });
    }

    if (path.includes(`/matches/${TEST_MATCH_ID}/summary.json`)) {
      return Response.json({
        sport_event: {
          id: TEST_MATCH_ID,
          status: 'live',
          scheduled: '2026-09-09T10:00:00Z',
          tournament: { name: 'Test Tournament' },
          venue: { name: 'Test Ground' },
          competitors: [
            { id: 'sr:team:a', name: 'Team A', abbreviation: 'TMA', qualifier: 'home' },
            { id: 'sr:team:b', name: 'Team B', abbreviation: 'TMB', qualifier: 'away' },
          ],
        },
        sport_event_status: {
          status: 'live',
          match_status: '1st innings',
          display_score: '120/2',
          display_overs: 15.3,
          run_rate: 7.8,
          period_scores: [
            { home_score: 120, home_wickets: 2, display_overs: 15.3 },
          ],
        },
      });
    }

    if (path.includes(`/matches/${STALE_MATCH_ID}/summary.json`)) {
      return Response.json(staleSummaryPayload());
    }

    if (path.includes(`/matches/${POSTPONED_MATCH_ID}/summary.json`)) {
      return Response.json(postponedSummaryPayload());
    }

    if (path.includes(`/matches/${TEST_MATCH_ID}/timeline/delta.json`)) {
      return Response.json({ sport_event_timeline: { timeline: [] } });
    }

    if (path.includes(`/matches/${TEST_MATCH_ID}/timeline.json`)) {
      return Response.json({ sport_event_timeline: { timeline: [] } });
    }

    return originalFetch(url);
  };
  return originalFetch;
}

describe('ingestion integration', () => {
  let originalFetch;

  before(async () => {
    originalFetch = mockFetch();
    await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS team_scores JSONB`);
    await query(`ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_text TEXT`);
    // Clean up any previous test state
    await redis.del(redisKeys.matchState(TEST_MATCH_ID));
    await redis.del(redisKeys.matchState(STALE_MATCH_ID));
    await redis.del(redisKeys.matchState(POSTPONED_MATCH_ID));
    await redis.srem(redisKeys.liveMatches(), TEST_MATCH_ID);
    await query(`DELETE FROM matches WHERE match_id = $1`, [TEST_MATCH_ID]);
    await query(`DELETE FROM matches WHERE match_id = $1`, [STALE_MATCH_ID]);
    await query(`DELETE FROM matches WHERE match_id = $1`, [POSTPONED_MATCH_ID]);
    await query(`DELETE FROM match_timelines WHERE match_id = $1`, [STALE_MATCH_ID]);
    await query(
      `DELETE FROM sport_event_records WHERE event_id = $1 AND kind = 'match_summary'`,
      [TEST_MATCH_ID],
    );
    await query(
      `DELETE FROM sport_event_records WHERE event_id = $1 AND kind = 'match_summary'`,
      [STALE_MATCH_ID],
    );
    await query(
      `DELETE FROM sport_event_records WHERE event_id = $1 AND kind = 'match_summary'`,
      [POSTPONED_MATCH_ID],
    );
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    await redis.del(redisKeys.matchState(TEST_MATCH_ID));
    await redis.del(redisKeys.matchState(STALE_MATCH_ID));
    await redis.del(redisKeys.matchState(POSTPONED_MATCH_ID));
    await redis.srem(redisKeys.liveMatches(), TEST_MATCH_ID);
    await query(`DELETE FROM matches WHERE match_id = $1`, [TEST_MATCH_ID]);
    await query(`DELETE FROM matches WHERE match_id = $1`, [STALE_MATCH_ID]);
    await query(`DELETE FROM matches WHERE match_id = $1`, [POSTPONED_MATCH_ID]);
    await query(`DELETE FROM match_timelines WHERE match_id = $1`, [STALE_MATCH_ID]);
    await query(
      `DELETE FROM sport_event_records WHERE event_id = $1 AND kind = 'match_summary'`,
      [TEST_MATCH_ID],
    );
    await query(
      `DELETE FROM sport_event_records WHERE event_id = $1 AND kind = 'match_summary'`,
      [STALE_MATCH_ID],
    );
    await query(
      `DELETE FROM sport_event_records WHERE event_id = $1 AND kind = 'match_summary'`,
      [POSTPONED_MATCH_ID],
    );
    await shutdownDb();
    await shutdownRedis();
  });

  it('pollOnce: fetches live schedule, persists match to DB and Redis', async () => {
    try {
      const liveCount = await pollOnce();
      assert.equal(liveCount, 1);

      // Verify DB
      const dbRes = await query(`SELECT * FROM matches WHERE match_id = $1`, [TEST_MATCH_ID]);
      assert.equal(dbRes.rows.length, 1);
      const row = dbRes.rows[0];
      assert.equal(row.match_id, TEST_MATCH_ID);
      assert.equal(row.status, 'live');
      assert.equal(row.display_score, '120/2');
      assert.ok(row.teams);
      assert.ok(row.team_names);

      // Verify Redis
      const stateRaw = await redis.get(redisKeys.matchState(TEST_MATCH_ID));
      assert.ok(stateRaw);
      const state = JSON.parse(stateRaw);
      assert.equal(state.matchId, TEST_MATCH_ID);
      assert.equal(state.status, 'live');

      const liveSet = await redis.smembers(redisKeys.liveMatches());
      assert.ok(liveSet.includes(TEST_MATCH_ID));

      const raw = await query(
        `SELECT payload FROM sport_event_records
         WHERE event_id = $1 AND kind = 'match_summary'`,
        [TEST_MATCH_ID],
      );
      assert.equal(raw.rows.length, 1);
      assert.equal(raw.rows[0].payload.sport_event_status.display_score, '120/2');
      assert.equal(raw.rows[0].payload.sport_event.venue.name, 'Test Ground');
    } catch (err) {
      console.error('TEST ERROR:', err);
      throw err;
    }
  });

  it('reference results remove completed matches from the Redis live set', async () => {
    await redis.sadd(redisKeys.liveMatches(), TEST_MATCH_ID);
    await saveSportEventRecords([
      {
        kind: 'daily_results',
        scopeKey: '2026-09-09',
        eventId: TEST_MATCH_ID,
        status: 'closed',
        scheduled: '2026-09-09T10:00:00Z',
        payload: {
          sport_event: {
            id: TEST_MATCH_ID,
            competitors: [
              { id: 'sr:team:a', name: 'Team A', abbreviation: 'TMA', qualifier: 'home' },
              { id: 'sr:team:b', name: 'Team B', abbreviation: 'TMB', qualifier: 'away' },
            ],
          },
          sport_event_status: { status: 'closed', match_status: 'ended' },
        },
      },
    ]);

    await saveSportEventRecords([
      {
        kind: 'daily_schedule',
        scopeKey: '2026-09-09',
        eventId: TEST_MATCH_ID,
        status: 'not_started',
        scheduled: '2026-09-09T10:00:00Z',
        payload: {
          sport_event: {
            id: TEST_MATCH_ID,
            status: 'not_started',
            scheduled: '2026-09-09T10:00:00Z',
            competitors: [
              { id: 'sr:team:a', name: 'Team A', abbreviation: 'TMA', qualifier: 'home' },
              { id: 'sr:team:b', name: 'Team B', abbreviation: 'TMB', qualifier: 'away' },
            ],
          },
        },
      },
    ]);

    const match = await query(
      `SELECT status FROM matches WHERE match_id = $1`,
      [TEST_MATCH_ID],
    );
    assert.equal(match.rows[0].status, 'completed');

    const liveSet = await redis.smembers(redisKeys.liveMatches());
    assert.equal(liveSet.includes(TEST_MATCH_ID), false);
  });

  it('refreshes overdue upcoming matches through the summary normalizer without changing their timelines', async () => {
    await query(
      `INSERT INTO matches (match_id, status, scheduled, teams, team_names, last_event)
       VALUES ($1, 'upcoming', '1900-01-01T10:00:00+00:00', '[]'::jsonb, '[]'::jsonb, '{"type":"none","runs":0,"over":0}'::jsonb)
       ON CONFLICT (match_id) DO UPDATE
       SET status = 'upcoming', scheduled = EXCLUDED.scheduled`,
      [STALE_MATCH_ID],
    );
    const existingTimeline = {
      sport_event_timeline: {
        timeline: [{ id: 'original-ball', sequence: 1, type: 'ball' }],
      },
    };
    await saveMatchTimeline(STALE_MATCH_ID, existingTimeline);

    assert.ok((await staleUpcomingIds()).includes(STALE_MATCH_ID));
    const match = await refreshStaleUpcomingMatch(STALE_MATCH_ID);

    assert.equal(match.status, 'completed');
    const rowResult = await query(
      `SELECT status, scheduled, team_scores, tournament_id, result_text
       FROM matches WHERE match_id = $1`,
      [STALE_MATCH_ID],
    );
    const row = rowResult.rows[0];
    assert.equal(row.status, 'completed');
    assert.equal(row.scheduled, '2026-10-01T10:00:00Z');
    assert.equal(row.tournament_id, 'sr:tournament:test');
    assert.equal(row.result_text, 'Team A won by 20 runs');
    assert.equal(row.team_scores.home.score, '180/4');
    assert.equal(row.team_scores.away.score, '160/10');

    const timelineResult = await query(
      `SELECT payload FROM match_timelines WHERE match_id = $1`,
      [STALE_MATCH_ID],
    );
    assert.deepEqual(timelineResult.rows[0].payload, existingTimeline);

    await query(
      `INSERT INTO matches (match_id, status, scheduled, teams, team_names, last_event)
       VALUES ($1, 'upcoming', '1900-01-01T10:00:00+00:00', '[]'::jsonb, '[]'::jsonb, '{"type":"none","runs":0,"over":0}'::jsonb)`,
      [POSTPONED_MATCH_ID],
    );
    const postponed = await refreshStaleUpcomingMatch(POSTPONED_MATCH_ID);
    assert.equal(postponed.status, 'upcoming');
    assert.equal(postponed.scheduled, '2026-10-05T10:00:00Z');
    const postponedRow = await query(
      `SELECT status, scheduled FROM matches WHERE match_id = $1`,
      [POSTPONED_MATCH_ID],
    );
    assert.equal(postponedRow.rows[0].status, 'upcoming');
    assert.equal(postponedRow.rows[0].scheduled, '2026-10-05T10:00:00Z');
  });
});
