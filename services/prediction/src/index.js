import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { EVENT_TYPES, PREDICTION_MODELS, PREDICTION_STAGE, redisKeys } from '@cricapp/shared-types';
import db, { query, shutdown as shutdownDb } from './db.js';
import redis, { duplicate, shutdown as shutdownRedis } from './redis.js';
import { createLogger } from './logger.js';
import { extractLiveFeatures, extractPrematchFeatures, listUpcomingMatchIds } from './features.js';
import { scorePrematch } from './prematch.js';
import { scoreLive } from './live.js';
import { battingIsHomeTeam, decidedWinProb, shouldSkipLivePrediction } from './liveGuard.js';
import { latestFeatureSnapshot, latestLiveResult, latestPrematchResult, persistPrediction } from './persist.js';
import {
  recalibrateAllFormats,
  rescaleWeights,
  resolveLiveScales,
  resolvePrematchCalibration,
  resolvePrematchWeights,
} from './calibrate.js';
import { snapshotPerformance } from './performance.js';
import { refreshRatings } from './ratings.js';

const log = createLogger('prediction');
const PREMATCH_INTERVAL_MS = Number(process.env.PREMATCH_INTERVAL_MS || 900000);
const LIVE_THROTTLE_MS = Number(process.env.LIVE_THROTTLE_MS || 15000);
const LIVE_REFRESH_MS = Number(process.env.LIVE_REFRESH_MS || 5000);
const PREMATCH_HORIZON_HOURS = Number(process.env.PREMATCH_HORIZON_HOURS || 720);
const CALIBRATION_INTERVAL_MS = Number(process.env.CALIBRATION_INTERVAL_MS || 3600000);
const LIVE_PRIOR_WEIGHT = Number(process.env.LIVE_PRIOR_WEIGHT || 0.6);
const LIVE_PRIOR_DECAY_PROGRESS = Number(process.env.LIVE_PRIOR_DECAY_PROGRESS || 0.6);

const liveThrottle = new Map();
const liveFingerprints = new Map();
/** Log once per process if Redis still lists an id with no Postgres row (then we srem). */
const staleLiveWarned = new Set();

async function dropStaleLiveMatchId(matchId) {
  const removed = await redis.srem(redisKeys.liveMatches(), matchId);
  liveThrottle.delete(matchId);
  liveFingerprints.delete(matchId);
  if (removed > 0) {
    log.info('removed stale id from matches:live', { matchId });
    return;
  }
  if (!staleLiveWarned.has(matchId)) {
    staleLiveWarned.add(matchId);
    log.warn('live skipped — match not found (not in matches:live)', { matchId });
  }
}

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

function liveFingerprint(snapshot) {
  const innings = snapshot.currentInnings ?? {};
  return [
    snapshot.currentInning ?? '',
    innings.runs ?? '',
    innings.wickets ?? '',
    innings.overs ?? '',
    snapshot.target ?? '',
    snapshot.displayScore ?? '',
    snapshot.remainingOvers ?? '',
    snapshot.requiredRunRate ?? '',
  ].join('|');
}

function isLiveTrigger(event) {
  if (!event?.matchId) return false;
  const type = event.type;
  if (
    type === EVENT_TYPES.RUNS ||
    type === EVENT_TYPES.WICKET ||
    type === EVENT_TYPES.STATUS_CHANGE ||
    type === EVENT_TYPES.MATCH_STARTED
  ) {
    return true;
  }
  // Full match snapshot from ingestion publishMatchState({ broadcast: true }).
  if (!type && (event.status === 'live' || event.currentInnings)) {
    return true;
  }
  return false;
}

export async function runPrematch(matchId) {
  const snapshot = await extractPrematchFeatures(matchId, { query, redis });
  if (!snapshot) {
    log.warn('prematch skipped — match not found', { matchId });
    return null;
  }
  const [calibration, weightPack] = await Promise.all([
    resolvePrematchCalibration(query, snapshot.format),
    resolvePrematchWeights(query),
  ]);
  snapshot.calibration = {
    slope: calibration.slope,
    intercept: calibration.intercept,
    source: calibration.source,
    format: snapshot.format,
  };
  snapshot.weights = weightPack.weights;
  const previousSnapshot = await latestFeatureSnapshot(
    query,
    matchId,
    PREDICTION_STAGE.PRE_MATCH,
    PREDICTION_MODELS.PREMATCH,
  );
  if (previousSnapshot && JSON.stringify(previousSnapshot) === JSON.stringify(snapshot)) {
    log.info('prematch unchanged — skipped', { matchId });
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
    await dropStaleLiveMatchId(matchId);
    return null;
  }
  const skip = shouldSkipLivePrediction(snapshot);
  if (skip) {
    log.info('live skipped — match decided or stale snapshot', { matchId, reason: skip });
    const decided = decidedWinProb(snapshot);
    if (!decided) return null;
    const previous = await latestLiveResult(query, matchId);
    const result = {
      ...decided,
      confidence: 0.95,
      calibrationBand: 'high',
      explanation: {
        over: snapshot.currentInnings?.overs ?? 0,
        wickets: snapshot.currentInnings?.wickets ?? 0,
        inning: snapshot.currentInning >= 2 ? 2 : 1,
        battingIsHome: battingIsHomeTeam(snapshot) ?? false,
        resourcesLeft: 0,
        remainingBalls: 0,
        requiredRunRate: null,
        requiredRuns: null,
        projectedTotal: null,
        deltaFromPrevious: Number(
          (decided.homeWinProb - (previous?.homeWinProb ?? decided.homeWinProb)).toFixed(4),
        ),
        reasons: ['match_decided'],
        factorAttributions: [],
        momentum: 0,
        pressureIndex: 0,
        wicketRisk: 0,
      },
      scoreRange: null,
      momentum: 0,
      pressureIndex: 0,
      wicketRisk: 0,
      partnershipProjection: null,
    };
    const id = await persistPrediction(query, {
      matchId,
      stage: PREDICTION_STAGE.LIVE,
      modelVersion: PREDICTION_MODELS.LIVE,
      snapshot,
      result,
    });
    log.info('live locked at result', { matchId, runId: id, homeWinProb: result.homeWinProb });
    return id;
  }
  const fingerprint = liveFingerprint(snapshot);
  const unchanged = liveFingerprints.get(matchId) === fingerprint;
  if (unchanged) return null;

  const over = snapshot.currentInnings?.overs ?? 0;
  if (!shouldScoreLive(matchId, over)) return null;
  const previous = await latestLiveResult(query, matchId);
  const prior = await latestPrematchResult(query, matchId);
  const result = scoreLive(snapshot, previous, {
    prior,
    priorWeightStart: LIVE_PRIOR_WEIGHT,
    priorDecayProgress: LIVE_PRIOR_DECAY_PROGRESS,
  });
  const id = await persistPrediction(query, {
    matchId,
    stage: PREDICTION_STAGE.LIVE,
    modelVersion: PREDICTION_MODELS.LIVE,
    snapshot,
    result,
  });
  liveFingerprints.set(matchId, fingerprint);
  log.info('live scored', { matchId, runId: id, homeWinProb: result.homeWinProb });
  return id;
}

export async function recalibrateModels() {
  const result = await recalibrateAllFormats(query);
  if (result.global?.applied) {
    log.info('prematch recalibrated', {
      slope: result.global.slope,
      intercept: result.global.intercept,
      sampleSize: result.global.sampleSize,
      brierScore: result.global.brierScore,
    });
  } else {
    log.info('prematch calibration skipped', {
      reason: result.global?.reason,
      sampleSize: result.global?.sampleSize,
    });
  }
  for (const formatFit of result.byFormat ?? []) {
    if (formatFit.applied) {
      log.info('prematch format recalibrated', {
        format: formatFit.format,
        slope: formatFit.slope,
        sampleSize: formatFit.sampleSize,
      });
    }
  }
  if (result.weights?.applied) {
    log.info('prematch weights fitted', {
      sampleSize: result.weights.sampleSize,
      accuracy: result.weights.accuracy,
      weights: result.weights.weights,
    });
  } else {
    log.info('prematch weights skipped', {
      reason: result.weights?.reason,
      sampleSize: result.weights?.sampleSize,
    });
  }
  if (result.liveScales?.applied) {
    log.info('live scales fitted', {
      sampleSize: result.liveScales.sampleSize,
      firstInningsScale: result.liveScales.firstInningsScale,
      chaseScale: result.liveScales.chaseScale,
    });
  }

  for (const stage of [PREDICTION_STAGE.PRE_MATCH, PREDICTION_STAGE.LIVE]) {
    const modelVersion =
      stage === PREDICTION_STAGE.PRE_MATCH ? PREDICTION_MODELS.PREMATCH : PREDICTION_MODELS.LIVE;
    try {
      const snap = await snapshotPerformance(query, { stage, modelVersion });
      if (snap.applied) {
        log.info('performance snapshot recorded', {
          stage,
          runId: snap.id,
          sampleSize: snap.stats.sampleSize,
          accuracy: snap.stats.accuracy,
          brierScore: snap.stats.brierScore,
          expectedCalibrationError: snap.stats.expectedCalibrationError,
        });
      } else {
        log.info('performance snapshot skipped', { stage, reason: snap.reason });
      }
    } catch (err) {
      log.error('performance snapshot failed', { stage, error: err.message });
    }
  }

  try {
    const weightsResult = await rescaleWeights(query);
    if (weightsResult.applied) {
      log.info('prematch weights refit', {
        formats: weightsResult.refits
          .filter((r) => r.applied)
          .map((r) => ({ format: r.format, sampleSize: r.sampleSize, brierScore: r.brierScore })),
      });
    } else if (weightsResult.refits?.length) {
      log.info('prematch weights unchanged', {
        formats: weightsResult.refits.map((r) => r.format),
      });
    } else {
      log.info('prematch weights skipped', { reason: weightsResult.reason });
    }
  } catch (err) {
    log.error('prematch weights refit failed', { error: err.message });
  }

  try {
    const ratingResult = await refreshRatings(query);
    log.info('team ratings refreshed', {
      settledMatches: ratingResult.settledMatches,
      ratedTeams: ratingResult.ratedTeams,
      trendBuckets: ratingResult.trendBuckets,
    });
  } catch (err) {
    log.error('team ratings refresh failed', { error: err.message });
  }
  return result;
}

export async function scoreUpcomingMatches() {
  const ids = await listUpcomingMatchIds(query, { horizonHours: PREMATCH_HORIZON_HOURS });
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

  sub.on('message', (_channel, message) => {
    let event;
    try {
      event = JSON.parse(message);
    } catch {
      return;
    }
    if (!isLiveTrigger(event)) return;
    const matchId = event.matchId;
    runLive(matchId).catch((err) => log.error('live score failed', { matchId, error: err.message }));
  });

  async function refresh() {
    const ids = await redis.smembers(redisKeys.liveMatches());
    for (const matchId of ids) {
      const channel = redisKeys.matchChannel(matchId);
      if (!subscribed.has(channel)) {
        await sub.subscribe(channel);
        subscribed.add(channel);
      }
      // Re-read Redis/Postgres on every refresh so live % keeps moving even when
      // ingestion only publishes untyped snapshots (or Redis events are sparse).
      runLive(matchId).catch((err) =>
        log.error('live refresh score failed', { matchId, error: err.message }),
      );
    }
    for (const channel of [...subscribed]) {
      const matchId = channel.slice('match:'.length);
      if (!ids.includes(matchId)) {
        await sub.unsubscribe(channel);
        subscribed.delete(channel);
        liveThrottle.delete(matchId);
        liveFingerprints.delete(matchId);
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
  await refreshRatings(query).catch((err) => log.error('initial ratings refresh failed', { error: err.message }));
  await scoreUpcomingMatches();
  setInterval(() => {
    scoreUpcomingMatches().catch((err) => log.error('prematch cycle failed', { error: err.message }));
  }, PREMATCH_INTERVAL_MS);
  await startLiveSubscriber();
  await recalibrateModels().catch((err) => log.error('calibration failed', { error: err.message }));
  setInterval(() => {
    recalibrateModels().catch((err) => log.error('calibration failed', { error: err.message }));
  }, CALIBRATION_INTERVAL_MS);
  log.info('prediction service started', {
    prematchIntervalMs: PREMATCH_INTERVAL_MS,
    liveThrottleMs: LIVE_THROTTLE_MS,
    liveRefreshMs: LIVE_REFRESH_MS,
    calibrationIntervalMs: CALIBRATION_INTERVAL_MS,
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
