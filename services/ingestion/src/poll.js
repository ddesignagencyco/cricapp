import { PROVIDERS } from './schemas.js';
import { normalizeMatch } from './normalize.js';
import { diffMatch, hasMatchChanged } from './diff.js';
import {
  saveMatch,
  saveMatchSummary,
  saveMatchTimeline,
  publishMatchState,
  publishEvents,
  pruneStaleLiveMatchRedisSet,
} from './store.js';
import { getCallStats } from './sportradar.js';
import redis, { redisKeys } from './redis.js';
import {
  fetchLiveSchedule,
  fetchMatchSummary,
  fetchMatchTimeline,
  fetchMatchTimelineDelta,
} from './sportradar.js';

const DELTAS_ENABLED = process.env.LIVE_TIMELINE_DELTAS === 'true';
/** Full timeline.json during live play; 0 disables. Default 3 (~every 3 live poll cycles). */
const TIMELINE_SNAPSHOT_EVERY = Number(
  process.env.LIVE_TIMELINE_SNAPSHOT_EVERY ?? 3,
);
const SNAPSHOT_KEY = (id) => `live:timeline:snapshot:n:${id}`;
const SEQ_KEY = (id) => `live:timeline:lastSeq:${id}`;
const BUF_KEY = (id) => `live:timeline:buf:${id}`;

async function readPrevious(matchId) {
  const raw = await redis.get(redisKeys.matchState(matchId));
  return raw ? JSON.parse(raw) : null;
}

/**
 * Optional live ball-by-ball capture: fetch timeline delta since the last
 * known sequence and buffer the new entries in a Redis list keyed to the
 * match. Gated by LIVE_TIMELINE_DELTAS=true. Buffers are supplementary to
 * the full snapshots persisted by maybeSnapshotLiveTimeline and are cleared
 * when the match leaves live — never persisted as a completed timeline.
 */
async function captureLiveTimelineDelta(matchId) {
  const lastSeq = Number(await redis.get(SEQ_KEY(matchId)) || 0);
  const data = await fetchMatchTimelineDelta(matchId, lastSeq);
  const timeline = data?.sport_event_timeline?.timeline ?? data?.timeline ?? [];
  if (!timeline.length) return;
  const last = timeline[timeline.length - 1];
  const newSeq = last.sequence ?? lastSeq;
  const entries = timeline.map(JSON.stringify);
  await redis
    .pipeline()
    .set(SEQ_KEY(matchId), newSeq)
    .rpush(BUF_KEY(matchId), ...entries)
    .exec();
}

/**
 * Clear live timeline Redis state (delta buffer, sequence, snapshot counter)
 * after a match leaves live. Never refetches: the retained match_timelines
 * row is the completed match's final stored timeline.
 */
async function clearLiveTimelineState(matchId) {
  await redis.del(BUF_KEY(matchId), SEQ_KEY(matchId), SNAPSHOT_KEY(matchId));
}

/** Periodic full timeline fetch during live play (when deltas are off or as backup). */
async function maybeSnapshotLiveTimeline(matchId) {
  if (TIMELINE_SNAPSHOT_EVERY <= 0) return;
  const n = Number(await redis.incr(SNAPSHOT_KEY(matchId)));
  if (n % TIMELINE_SNAPSHOT_EVERY !== 0) return;
  const raw = await fetchMatchTimeline(matchId);
  await saveMatchTimeline(matchId, raw);
}

async function processLiveMatch(id) {
  const summary = await fetchMatchSummary(id);
  const next = normalizeMatch(PROVIDERS.SPORTRADAR, summary);
  const previous = await readPrevious(next.matchId);

  const events = diffMatch(previous, next);
  const changed = hasMatchChanged(previous, next);

  await saveMatchSummary(next.matchId, summary);
  await saveMatch(next);
  await publishMatchState(next, { broadcast: changed });
  if (events.length) {
    await publishEvents(events);
    console.log(`[ingest] ${next.matchId}: ${events.map((e) => e.type).join(', ')}`);
  } else if (changed) {
    console.log(`[ingest] ${next.matchId}: snapshot`);
  }

  if (next.status === 'live') {
    await maybeSnapshotLiveTimeline(id);
    if (DELTAS_ENABLED) {
      await captureLiveTimelineDelta(id);
    }
  } else {
    // Match is no longer live: retain the final stored timeline as-is. The
    // completed match page reads these exact records — do not refetch or
    // reinsert the full timeline after completion.
    await clearLiveTimelineState(id);
  }
}

export async function pollOnce() {
  const liveEvents = await fetchLiveSchedule();
  const liveIds = liveEvents
    .filter((se) => se.status === 'live')
    .map((se) => se.id);

  for (const id of liveIds) {
    try {
      await processLiveMatch(id);
    } catch (err) {
      console.error(`[ingest] failed for ${id}`, err.message);
    }
  }

  const pruned = await pruneStaleLiveMatchRedisSet();
  if (pruned.length > 0) {
    console.log(`[ingest] pruned stale matches:live ids: ${pruned.join(', ')}`);
  }

  await redis.set(
    'ingestion:heartbeat',
    JSON.stringify({ ts: Date.now(), liveCount: liveIds.length }),
    'EX',
    120,
  );

  const s = getCallStats();
  console.log(`[ingest] poll cycle: live=${liveIds.length} calls=${s.calls} retries=${s.retries}`);
  return liveIds.length;
}
