import pg from 'pg';

const CONN = Deno.env.get('PREDICTION_DATABASE_URL');

function requireConn() {
  if (!CONN) throw new Error('PREDICTION_DATABASE_URL is not set');
  return CONN;
}

Deno.env.set('DATABASE_URL', requireConn());
process.env.DATABASE_URL = requireConn();

const { extractLiveFeatures, extractPrematchFeatures, listUpcomingMatchIds } = await import(
  '../../../services/prediction/src/features.js'
);
const { scorePrematch } = await import('../../../services/prediction/src/prematch.js');
const { scoreLive } = await import('../../../services/prediction/src/live.js');
const { battingIsHomeTeam, decidedWinProb, shouldSkipLivePrediction } = await import(
  '../../../services/prediction/src/liveGuard.js'
);
const { latestFeatureSnapshot, latestLiveResult, latestPrematchResult, persistPrediction } =
  await import('../../../services/prediction/src/persist.js');
const {
  recalibrateAllFormats,
  rescaleWeights,
  resolvePrematchCalibration,
  resolvePrematchWeights,
} = await import('../../../services/prediction/src/calibrate.js');
const { snapshotPerformance } = await import('../../../services/prediction/src/performance.js');
const { refreshRatings } = await import('../../../services/prediction/src/ratings.js');
const { workerIsActive } = await import('../../../services/prediction/src/schedulerLock.js');
const { PREDICTION_MODELS, PREDICTION_STAGE } = await import('../../../packages/shared-types/src/index.js');

const PREMATCH_HORIZON_HOURS = Number(Deno.env.get('PREMATCH_HORIZON_HOURS') ?? 720);
const LIVE_PRIOR_WEIGHT = Number(Deno.env.get('LIVE_PRIOR_WEIGHT') ?? 0.6);
const LIVE_PRIOR_DECAY_PROGRESS = Number(Deno.env.get('LIVE_PRIOR_DECAY_PROGRESS') ?? 0.6);

const redis = null;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function withClient(fn) {
  const client = new pg.Client({ connectionString: requireConn() });
  await client.connect();
  try {
    return await fn(client.query.bind(client), client);
  } finally {
    await client.end().catch(() => {});
  }
}

function fingerprint(snapshot) {
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

async function lastStoredFingerprint(query, matchId) {
  const r = await query(
    `SELECT f.snapshot
       FROM prediction_features f
       JOIN prediction_runs r ON r.id = f.run_id
      WHERE r.match_id = $1 AND r.stage = $2
      ORDER BY r.created_at DESC
      LIMIT 1`,
    [matchId, PREDICTION_STAGE.LIVE],
  );
  const snap = r.rows[0]?.snapshot;
  return snap ? fingerprint(snap) : null;
}

async function runPrematch(query, matchId) {
  const snapshot = await extractPrematchFeatures(matchId, { query, redis });
  if (!snapshot) return { matchId, skipped: 'not_found' };

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

  const previous = await latestFeatureSnapshot(
    query,
    matchId,
    PREDICTION_STAGE.PRE_MATCH,
    PREDICTION_MODELS.PREMATCH,
  );
  if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) {
    return { matchId, skipped: 'unchanged' };
  }

  const result = scorePrematch(snapshot);
  const runId = await persistPrediction(query, {
    matchId,
    stage: PREDICTION_STAGE.PRE_MATCH,
    modelVersion: PREDICTION_MODELS.PREMATCH,
    snapshot,
    result,
  });
  return { matchId, runId, homeWinProb: result.homeWinProb };
}

async function runLive(query, matchId) {
  const snapshot = await extractLiveFeatures(matchId, { query, redis });
  if (!snapshot) return { matchId, skipped: 'not_found' };

  const skip = shouldSkipLivePrediction(snapshot);
  if (skip) {
    const decided = decidedWinProb(snapshot);
    if (!decided) return { matchId, skipped: `guard:${skip}` };
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
    const runId = await persistPrediction(query, {
      matchId,
      stage: PREDICTION_STAGE.LIVE,
      modelVersion: PREDICTION_MODELS.LIVE,
      snapshot,
      result,
    });
    return { matchId, runId, locked: true, homeWinProb: result.homeWinProb };
  }

  const stored = await lastStoredFingerprint(query, matchId);
  const current = fingerprint(snapshot);
  if (stored === current) return { matchId, skipped: 'unchanged' };

  const previous = await latestLiveResult(query, matchId);
  const prior = await latestPrematchResult(query, matchId);
  const result = scoreLive(snapshot, previous, {
    prior,
    priorWeightStart: LIVE_PRIOR_WEIGHT,
    priorDecayProgress: LIVE_PRIOR_DECAY_PROGRESS,
  });
  const runId = await persistPrediction(query, {
    matchId,
    stage: PREDICTION_STAGE.LIVE,
    modelVersion: PREDICTION_MODELS.LIVE,
    snapshot,
    result,
  });
  return { matchId, runId, homeWinProb: result.homeWinProb };
}

async function prematchCycle(query) {
  const ids = await listUpcomingMatchIds(query, { horizonHours: PREMATCH_HORIZON_HOURS });
  const out = [];
  for (const id of ids) {
    try {
      out.push(await runPrematch(query, id));
    } catch (err) {
      out.push({ matchId: id, error: err.message });
    }
  }
  return { task: 'prematch', considered: ids.length, results: out };
}

async function liveCycle(query) {
  const r = await query(`SELECT match_id FROM matches WHERE status = 'live' ORDER BY scheduled NULLS LAST`);
  const ids = r.rows.map((row) => row.match_id);
  const out = [];
  for (const id of ids) {
    try {
      out.push(await runLive(query, id));
    } catch (err) {
      out.push({ matchId: id, error: err.message });
    }
  }
  return { task: 'live', liveMatches: ids.length, results: out };
}

async function calibrateCycle(query) {
  const result = await recalibrateAllFormats(query);
  for (const stage of [PREDICTION_STAGE.PRE_MATCH, PREDICTION_STAGE.LIVE]) {
    const modelVersion =
      stage === PREDICTION_STAGE.PRE_MATCH ? PREDICTION_MODELS.PREMATCH : PREDICTION_MODELS.LIVE;
    try {
      await snapshotPerformance(query, { stage, modelVersion });
    } catch (err) {
      console.error('performance snapshot failed', { stage, error: err.message });
    }
  }
  try {
    await rescaleWeights(query);
  } catch (err) {
    console.error('weights refit failed', { error: err.message });
  }
  let ratings = null;
  try {
    ratings = await refreshRatings(query);
  } catch (err) {
    console.error('ratings refresh failed', { error: err.message });
  }
  return {
    task: 'calibrate',
    global: result.global ?? null,
    byFormat: result.byFormat ?? [],
    ratings: ratings ? { settledMatches: ratings.settledMatches, ratedTeams: ratings.ratedTeams } : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { Allow: 'POST, OPTIONS' } });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let task = 'prematch';
  const bodyText = await req.text().catch(() => '');
  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed?.task) task = String(parsed.task);
    } catch {
      return json({ error: 'invalid json body' }, 400);
    }
  }

  const started = Date.now();
  try {
    const payload = await withClient(async (query) => {
      // The long-running worker holds an advisory lock while it is up. When it does,
      // this cron run steps aside so the two never write the same rows.
      if (await workerIsActive(query)) return { task, skipped: 'worker_active' };
      if (task === 'live') return liveCycle(query);
      if (task === 'calibrate') return calibrateCycle(query);
      if (task === 'prematch') return prematchCycle(query);
      throw new Error(`unknown task "${task}"`);
    });
    return json({ ok: true, durationMs: Date.now() - started, ...payload });
  } catch (err) {
    console.error('prediction-run failed', { task, error: err.message });
    return json({ ok: false, task, error: err.message, durationMs: Date.now() - started }, 500);
  }
});