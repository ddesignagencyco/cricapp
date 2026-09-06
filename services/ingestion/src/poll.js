import { PROVIDERS } from './schemas.js';
import { normalizeMatch } from './normalize.js';
import { diffMatch } from './diff.js';
import { saveMatch, saveMatchTimeline, publishMatchState, publishEvents } from './store.js';
import { getCallStats } from './sportradar.js';
import redis from './redis.js';
import {
  fetchLiveSchedule,
  fetchMatchSummary,
  fetchMatchTimelineDelta,
} from './sportradar.js';

const DELTAS_ENABLED = process.env.LIVE_TIMELINE_DELTAS === 'true';
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
  const entries = (await redis.lrange(BUF_KEY(matchId), 0, -1)).map(JSON.parse);
  await redis.del(BUF_KEY(matchId), SEQ_KEY(matchId));
  if (!entries.length) return;
  const norm = { matchId, payload: { sport_event_timeline: { timeline: entries } } };
  await saveMatchTimeline(norm.matchId, norm.payload);
}

async function processLiveMatch(id) {
  const summary = await fetchMatchSummary(id);
  const next = normalizeMatch(PROVIDERS.SPORTRADAR, summary);
  const previous = await readPrevious(next.matchId);

  const events = diffMatch(previous, next);

  await saveMatch(next);
  await publishMatchState(next);
  if (events.length) {
    await publishEvents(events);
    console.log(`[ingest] ${next.matchId}: ${events.map((e) => e.type).join(', ')}`);
  }

  if (DELTAS_ENABLED) {
    await captureLiveTimelineDelta(id);
    await flushLiveTimelineIfFinished(id, next.status);
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

  const s = getCallStats();
  console.log(`[ingest] poll cycle: live=${liveIds.length} calls=${s.calls} retries=${s.retries}`);
  return liveIds.length;
}
