import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { EVENT_TYPES, PREDICTION_MODELS, PREDICTION_STAGE, redisKeys } from '@cricapp/shared-types';
import db, { query, shutdown as shutdownDb } from './db.js';
import redis, { duplicate, shutdown as shutdownRedis } from './redis.js';
import { createLogger } from './logger.js';
import { extractLiveFeatures, extractPrematchFeatures, listUpcomingMatchIds } from './features.js';
import { scorePrematch } from './prematch.js';
import { scoreLive } from './live.js';
import { latestLiveResult, persistPrediction } from './persist.js';

const log = createLogger('prediction');
const PREMATCH_INTERVAL_MS = Number(process.env.PREMATCH_INTERVAL_MS || 900000);
const LIVE_THROTTLE_MS = Number(process.env.LIVE_THROTTLE_MS || 15000);
const LIVE_REFRESH_MS = Number(process.env.LIVE_REFRESH_MS || 5000);

const liveThrottle = new Map();

function shouldScoreLive(matchId, over) {
  const now = Date.now();
  const prev = liveThrottle.get(matchId);
  if (!prev) {
    liveThrottle.set(matchId, { at: now, over });
    return true;
  }
  if (now - prev.at < LIVE_THROTTLE_MS && prev.over === over) return false;
  liveThrottle.set(matchId, { at: now, over });
  return true;
}

export async function runPrematch(matchId) {
  const snapshot = await extractPrematchFeatures(matchId, { query, redis });
  if (!snapshot) {
    log.warn('prematch skipped — match not found', { matchId });
    return null;
  }
  const result = scorePrematch(snapshot);
  const id = await persistPrediction(query, {
    matchId,
    stage: PREDICTION_STAGE.PRE_MATCH,
    modelVersion: PREDICTION_MODELS.PREMATCH,
    snapshot,
    result,
  });
  log.info('prematch scored', { matchId, runId: id, homeWinProb: result.homeWinProb });
  return id;
}

export async function runLive(matchId) {
  const snapshot = await extractLiveFeatures(matchId, { query, redis });
  if (!snapshot) {
    log.warn('live skipped — match not found', { matchId });
    return null;
  }
  const over = snapshot.currentInnings?.overs ?? 0;
  if (!shouldScoreLive(matchId, over)) return null;
  const previous = await latestLiveResult(query, matchId);
  const result = scoreLive(snapshot, previous);
  const id = await persistPrediction(query, {
    matchId,
    stage: PREDICTION_STAGE.LIVE,
    modelVersion: PREDICTION_MODELS.LIVE,
    snapshot,
    result,
  });
  log.info('live scored', { matchId, runId: id, homeWinProb: result.homeWinProb });
  return id;
}

export async function scoreUpcomingMatches() {
  const ids = await listUpcomingMatchIds(query);
  log.info('prematch cycle', { count: ids.length });
  for (const matchId of ids) {
    try {
      await runPrematch(matchId);
    } catch (err) {
      log.error('prematch failed', { matchId, error: err.message });
    }
  }
}

async function ping() {
  await db.query('SELECT 1');
  log.info('postgres connected');
  await redis.ping();
  log.info('redis connected');
}

export async function startLiveSubscriber() {
  const sub = duplicate();
  const subscribed = new Set();

  sub.on('error', (err) => {
    log.error('redis subscriber error', { error: err.message });
  });

  sub.on('message', (channel, message) => {
    let event;
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }
    const matchId = event.matchId;
    if (!matchId) return;
    const type = event.type;
    if (
      type !== EVENT_TYPES.RUNS &&
      type !== EVENT_TYPES.WICKET &&
      type !== EVENT_TYPES.STATUS_CHANGE &&
      type !== EVENT_TYPES.MATCH_STARTED
    ) {
      return;
    }
    runLive(matchId).catch((err) => log.error('live score failed', { matchId, error: err.message }));
  });

  async function refresh() {
    const ids = await redis.smembers(redisKeys.liveMatches());
    for (const matchId of ids) {
      const channel = redisKeys.matchChannel(matchId);
      if (!subscribed.has(channel)) {
        await sub.subscribe(channel);
        subscribed.add(channel);
        runLive(matchId).catch((err) =>
          log.error('live initial score failed', { matchId, error: err.message }),
        );
      }
    }
    for (const channel of [...subscribed]) {
      const matchId = channel.slice('match:'.length);
      if (!ids.includes(matchId)) {
        await sub.unsubscribe(channel);
        subscribed.delete(channel);
        liveThrottle.delete(matchId);
      }
    }
  }

  await refresh();
  const timer = setInterval(() => {
    refresh().catch((err) => log.error('live refresh failed', { error: err.message }));
  }, LIVE_REFRESH_MS);

  return async () => {
    clearInterval(timer);
    await sub.quit();
  };
}

async function shutdown() {
  log.info('shutting down...');
  await shutdownRedis();
  await shutdownDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
  await ping();
  await scoreUpcomingMatches();
  setInterval(() => {
    scoreUpcomingMatches().catch((err) => log.error('prematch cycle failed', { error: err.message }));
  }, PREMATCH_INTERVAL_MS);
  await startLiveSubscriber();
  log.info('prediction service started', {
    prematchIntervalMs: PREMATCH_INTERVAL_MS,
    liveThrottleMs: LIVE_THROTTLE_MS,
  });
}

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main().catch((err) => {
    log.error('fatal', { error: err.message });
    process.exit(1);
  });
}
