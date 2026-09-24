process.env.SPORTRADAR_QPS = '1000';
process.env.LIVE_TIMELINE_DELTAS = 'false';
process.env.LIVE_TIMELINE_SNAPSHOT_EVERY = '1';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { query, shutdown as shutdownDb } from '../src/db.js';
import redis, { redisKeys, shutdown as shutdownRedis } from '../src/redis.js';

// Dynamic import AFTER the env assignments: poll.js resolves its module-level
// timeline constants (snapshot cadence, deltas) at load time.
const { pollOnce } = await import('../src/poll.js');

const TEST_MATCH_ID = 'sr:match:int-88888';

// Timeline returned by the mock while live. Contains a duplicate event id
// (t1 twice) so the persistence path is proven to dedupe by stable id.
const LIVE_TIMELINE_PAYLOAD = {
  sport_event_timeline: {
    sport_event_status: { status: 'live', match_status: '1st innings', display_overs: 15.3 },
    timeline: [
      { id: 't1', sequence: 1, type: 'ball', commentary: 'dot ball' },
      { id: 't2', sequence: 2, type: 'ball', commentary: 'four runs' },
      { id: 't1', sequence: 1, type: 'ball', commentary: 'dot ball' },
      { id: 't3', sequence: 3, type: 'ball', commentary: 'wicket' },
    ],
  },
};

// A materially different timeline the mock would return on any post-completion
// fetch. If the fix regresses and the poll loop refetches after completion,
// this would show up in the stored row.
const COMPLETED_TIMELINE_PAYLOAD = {
  sport_event_timeline: {
    sport_event_status: { status: 'closed', match_status: 'ended', display_overs: 20 },
    timeline: [
      { id: 't1', sequence: 1, type: 'ball' },
      { id: 't2', sequence: 2, type: 'ball' },
      { id: 't3', sequence: 3, type: 'ball' },
      { id: 't4', sequence: 4, type: 'ball', commentary: 'final ball' },
    ],
  },
};

function summaryPayload(status) {
  const ended = status !== 'live';
  return {
    sport_event: {
      id: TEST_MATCH_ID,
      status: ended ? 'closed' : 'live',
      scheduled: '2026-09-09T10:00:00Z',
      tournament: { name: 'Test Tournament' },
      venue: { name: 'Test Ground' },
      competitors: [
        { id: 'sr:team:a', name: 'Team A', abbreviation: 'TMA', qualifier: 'home' },
        { id: 'sr:team:b', name: 'Team B', abbreviation: 'TMB', qualifier: 'away' },
      ],
    },
    sport_event_status: ended
      ? {
          status: 'closed',
          match_status: 'ended',
          display_score: '180/4',
          display_overs: 20,
          run_rate: 9.0,
          period_scores: [{ home_score: 180, home_wickets: 4, display_overs: 20 }],
        }
      : {
          status: 'live',
          match_status: '1st innings',
          display_score: '120/2',
          display_overs: 15.3,
          run_rate: 7.8,
          period_scores: [{ home_score: 120, home_wickets: 2, display_overs: 15.3 }],
        },
  };
}

function mockFetch() {
  const originalFetch = globalThis.fetch;
  let matchStatus = 'live';
  let timelineCalls = 0;
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
      return Response.json(summaryPayload(matchStatus));
    }

    if (path.includes(`/matches/${TEST_MATCH_ID}/timeline/delta.json`)) {
      return Response.json({ sport_event_timeline: { timeline: [] } });
    }

    if (path.includes(`/matches/${TEST_MATCH_ID}/timeline.json`)) {
      timelineCalls += 1;
      return Response.json(matchStatus === 'live' ? LIVE_TIMELINE_PAYLOAD : COMPLETED_TIMELINE_PAYLOAD);
    }

    return originalFetch(url);
  };
  return { originalFetch, setMatchStatus: (s) => { matchStatus = s; }, getTimelineCalls: () => timelineCalls };
}

async function storedTimeline() {
  const r = await query(
    `SELECT payload, updated_at FROM match_timelines WHERE match_id = $1`,
    [TEST_MATCH_ID],
  );
  return r.rows[0] ?? null;
}

async function storedTimelineEventIds() {
  const row = await storedTimeline();
  if (!row) return null;
  const timeline = row.payload?.sport_event_timeline?.timeline ?? [];
  return timeline.map((e) => e.id);
}

describe('matchTimeline: live -> completed transition', () => {
  let originalFetch;
  let setMatchStatus;
  let getTimelineCalls;

  before(async () => {
    const mock = mockFetch();
    originalFetch = mock.originalFetch;
    setMatchStatus = mock.setMatchStatus;
    getTimelineCalls = mock.getTimelineCalls;
    await redis.del(
      redisKeys.matchState(TEST_MATCH_ID),
      `live:timeline:snapshot:n:${TEST_MATCH_ID}`,
      `live:timeline:buf:${TEST_MATCH_ID}`,
      `live:timeline:lastSeq:${TEST_MATCH_ID}`,
    );
    await redis.srem(redisKeys.liveMatches(), TEST_MATCH_ID);
    await query(`DELETE FROM matches WHERE match_id = $1`, [TEST_MATCH_ID]);
    await query(`DELETE FROM sport_event_records WHERE event_id = $1`, [TEST_MATCH_ID]);
    await query(`DELETE FROM match_timelines WHERE match_id = $1`, [TEST_MATCH_ID]);
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    await redis.del(redisKeys.matchState(TEST_MATCH_ID));
    await redis.srem(redisKeys.liveMatches(), TEST_MATCH_ID);
    await query(`DELETE FROM matches WHERE match_id = $1`, [TEST_MATCH_ID]);
    await query(`DELETE FROM sport_event_records WHERE event_id = $1`, [TEST_MATCH_ID]);
    await query(`DELETE FROM match_timelines WHERE match_id = $1`, [TEST_MATCH_ID]);
    await shutdownDb();
    await shutdownRedis();
  });

  it('persists a deduplicated timeline scoped by matchId while the match is live', async () => {
    await pollOnce();

    const row = await storedTimeline();
    assert.ok(row, 'match_timelines row should exist after the live poll');
    assert.equal(getTimelineCalls(), 1, 'exactly one timeline fetch while live');

    // Deduped by stable event id: t1 duplicate removed, order preserved.
    assert.deepEqual(await storedTimelineEventIds(), ['t1', 't2', 't3']);
    assert.equal(row.updated_at instanceof Date, true);
  });

  it('freezes the stored timeline when the match completes: no refetch, no reinsert', async () => {
    const rowBefore = await storedTimeline();
    const callsBefore = getTimelineCalls();
    const updatedBefore = rowBefore.updated_at.getTime();

    setMatchStatus('completed');
    await pollOnce();

    // The live schedule still listed the match, so it was polled again — the
    // summary now reports closed/ended. The stored timeline must NOT be
    // refetched or rewritten.
    assert.equal(getTimelineCalls(), callsBefore, 'no timeline.json fetch after completion');

    const rowAfter = await storedTimeline();
    assert.ok(rowAfter, 'completed match retains its stored timeline');
    assert.equal(rowAfter.updated_at.getTime(), updatedBefore, 'timeline row untouched at completion');
    assert.deepEqual(
      await storedTimelineEventIds(),
      ['t1', 't2', 't3'],
      'stored entries are the final live snapshot, not a completed refetch',
    );

    // Live-timeline Redis state is cleared when the match leaves live.
    const snapshotN = await redis.get(`live:timeline:snapshot:n:${TEST_MATCH_ID}`);
    const buf = await redis.get(`live:timeline:buf:${TEST_MATCH_ID}`);
    const seq = await redis.get(`live:timeline:lastSeq:${TEST_MATCH_ID}`);
    assert.equal(snapshotN, null);
    assert.equal(buf, null);
    assert.equal(seq, null);
  });
});