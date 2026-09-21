import { PROVIDERS } from './schemas.js';
import { normalizeMatch } from './normalize.js';
import { diffMatch, hasMatchChanged } from './diff.js';
import {
  saveMatch,
  saveMatchSummary,
  saveMatchTimeline,
  publishMatchState,
  publishEvents,
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
const TIMELINE_SNAPSHOT_EVERY = Number(process.env.LIVE_TIMELINE_SNAPSHOT_EVERY || 0);
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
 * match. Gated by LIVE_TIMELINE_DELTAS=true.
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
 * Flush buffered live-timeline entries into match_timelines on transition
 * to completed/cancelled, then clean up the Redis buffers.
 */
async function flushLiveTimelineIfFinished(matchId, status) {
  if (status === 'live') return;
  await redis.del(BUF_KEY(matchId), SEQ_KEY(matchId), SNAPSHOT_KEY(matchId));
  try {
    const raw = await fetchMatchTimeline(matchId);
    await saveMatchTimeline(matchId, raw);
  } catch (err) {
    console.warn(`[ingest] full timeline fetch failed for ${matchId}: ${err.message}`);
  }
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

  if (DELTAS_ENABLED) {
    await captureLiveTimelineDelta(id);
    await flushLiveTimelineIfFinished(id, next.status);
  } else {
    await maybeSnapshotLiveTimeline(id);
    if (next.status !== 'live') {
      await redis.del(SNAPSHOT_KEY(id));
    }
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
