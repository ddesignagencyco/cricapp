process.env.SPORTRADAR_QPS = '1000';
process.env.LIVE_TIMELINE_DELTAS = 'false';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, shutdown as shutdownDb } from '../src/db.js';
import redis, { redisKeys, shutdown as shutdownRedis } from '../src/redis.js';
import { pollOnce } from '../src/poll.js';
import { saveSportEventRecords } from '../src/store.js';

const TEST_MATCH_ID = 'sr:match:int-99999';

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

    if (path.includes(`/matches/${TEST_MATCH_ID}/timeline/delta.json`)) {
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
    // Clean up any previous test state
    await redis.del(redisKeys.matchState(TEST_MATCH_ID));
    await redis.srem(redisKeys.liveMatches(), TEST_MATCH_ID);
    await query(`DELETE FROM matches WHERE match_id = $1`, [TEST_MATCH_ID]);
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    await redis.del(redisKeys.matchState(TEST_MATCH_ID));
    await redis.srem(redisKeys.liveMatches(), TEST_MATCH_ID);
    await query(`DELETE FROM matches WHERE match_id = $1`, [TEST_MATCH_ID]);
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

    const liveSet = await redis.smembers(redisKeys.liveMatches());
    assert.equal(liveSet.includes(TEST_MATCH_ID), false);
  });
});
