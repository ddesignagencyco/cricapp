import { randomUUID } from 'node:crypto';
import { PREDICTION_MODELS, PREDICTION_STAGE } from '@cricapp/shared-types';
import { extractWinnerId } from './features.js';
import { featureVectorFromSnapshot } from './prematch.js';
import { fitPlattCalibration, fitWeights } from './settle.js';
import {
  defaultPrematchWeights,
  edgesFromExplanation,
  fitLiveScales,
  fitPrematchWeights,
} from './weights.js';

const MIN_SAMPLES = Number(process.env.CALIBRATION_MIN_SAMPLES || 40);
const WEIGHT_MIN_SAMPLES = Number(process.env.WEIGHT_MIN_SAMPLES || 40);
const LOCKED = String(process.env.PREMATCH_CALIBRATION_LOCKED || '').toLowerCase() === 'true';
const WEIGHTS_LOCKED = String(process.env.PREDICTION_WEIGHTS_LOCKED || '').toLowerCase() === 'true';
const WEIGHTS_MIN_SAMPLES = Number(process.env.WEIGHTS_MIN_SAMPLES || 20);
const FORMATS = ['t20', 'odi', 'test', 'unknown'];

function formatModelVersion(base, format) {
  if (!format || format === 'unknown') return base;
  return `${base}:${format}`;
}

export async function loadLatestCalibration(query, modelVersion = PREDICTION_MODELS.PREMATCH) {
  try {
    const r = await query(
      `SELECT slope, intercept, sample_size, brier_score, accuracy, source, params, created_at
       FROM prediction_calibrations
       WHERE model_version = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [modelVersion],
    );
    return r.rows[0] ?? null;
  } catch (err) {
    if (String(err.message ?? '').includes('prediction_calibrations')) return null;
    throw err;
  }
}

export async function saveCalibration(
  query,
  fit,
  {
    modelVersion = PREDICTION_MODELS.PREMATCH,
    source = 'auto',
    stage = PREDICTION_STAGE.PRE_MATCH,
    params = null,
  } = {},
) {
  const id = randomUUID();
  await query(
    `INSERT INTO prediction_calibrations
       (id, model_version, stage, slope, intercept, sample_size, brier_score, accuracy, source, params, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())`,
    [
      id,
      modelVersion,
      stage,
      fit.slope ?? 1,
      fit.intercept ?? 0,
      fit.sampleSize,
      fit.brierScore ?? null,
      fit.accuracy ?? null,
      source,
      params ? JSON.stringify(params) : null,
    ],
  );
  return id;
}

export async function loadSettledPrematchOutcomes(query, modelVersion = PREDICTION_MODELS.PREMATCH) {
  const r = await query(
    `SELECT res.home_win_prob, res.explanation, feat.snapshot, rec.payload, m.tournament, m.match_status
     FROM matches m
     JOIN prediction_runs run
       ON run.match_id = m.match_id
      AND run.stage = 'pre_match'
      AND run.model_version = $1
     JOIN prediction_results res ON res.run_id = run.id
     LEFT JOIN prediction_features feat ON feat.run_id = run.id
     LEFT JOIN LATERAL (
       SELECT payload
       FROM sport_event_records
       WHERE event_id = m.match_id
       ORDER BY updated_at DESC
       LIMIT 1
     ) rec ON true
     WHERE m.status = 'completed'
       AND run.created_at = (
         SELECT MAX(r2.created_at)
         FROM prediction_runs r2
         WHERE r2.match_id = m.match_id
           AND r2.stage = 'pre_match'
           AND r2.model_version = $1
       )`,
    [modelVersion],
  );

  return r.rows.flatMap((row) => {
    const snapshot = row.snapshot ?? {};
    const explanation = row.explanation ?? {};
    const homeTeamId = snapshot.homeTeamId ?? null;
    const awayTeamId = snapshot.awayTeamId ?? null;
    const actualWinnerId = extractWinnerId(row.payload, [homeTeamId, awayTeamId].filter(Boolean));
    if (!actualWinnerId || !homeTeamId || !awayTeamId) return [];
    const z = Number(explanation.z);
    if (!Number.isFinite(z)) return [];
    return [
      {
        z,
        homeWon: actualWinnerId === homeTeamId,
        homeWinProb: Number(row.home_win_prob),
        format: snapshot.format || 'unknown',
        edges: edgesFromExplanation(explanation, snapshot),
        tournament: row.tournament,
        matchStatus: row.match_status,
      },
    ];
  });
}

export async function resolvePrematchWeights(query) {
  const latest = await loadLatestCalibration(query, PREDICTION_MODELS.PREMATCH_WEIGHTS);
  const params = latest?.params;
  if (params?.weights) {
    return {
      weights: { ...defaultPrematchWeights(), ...params.weights },
      source: latest.source,
      sampleSize: latest.sample_size,
    };
  }
  return { weights: defaultPrematchWeights(), source: 'default' };
}

export async function resolveLiveScales(query) {
  const latest = await loadLatestCalibration(query, PREDICTION_MODELS.LIVE_SCALES);
  const params = latest?.params;
  if (params?.firstInningsScale) {
    return {
      firstInningsScale: Number(params.firstInningsScale),
      chaseScale: Number(params.chaseScale ?? 18),
      chaseWicketBonus: Number(params.chaseWicketBonus ?? 0.35),
      source: latest.source,
    };
  }
  return {
    firstInningsScale: 25,
    chaseScale: 18,
    chaseWicketBonus: 0.35,
    source: 'default',
  };
}

export async function resolvePrematchCalibration(query, format = 'unknown') {
  const envSlope = Number(process.env.PREMATCH_CALIBRATION_SLOPE);
  const envIntercept = Number(process.env.PREMATCH_CALIBRATION_INTERCEPT);
  if (LOCKED && Number.isFinite(envSlope) && Number.isFinite(envIntercept)) {
    return { slope: envSlope, intercept: envIntercept, source: 'env_locked', format };
  }

  const formatVersion = formatModelVersion(PREDICTION_MODELS.PREMATCH, format);
  const latestFormat = await loadLatestCalibration(query, formatVersion);
  if (latestFormat && Number(latestFormat.sample_size) >= MIN_SAMPLES) {
    return {
      slope: Number(latestFormat.slope),
      intercept: Number(latestFormat.intercept),
      source: latestFormat.source,
      fittedAt: latestFormat.created_at,
      sampleSize: latestFormat.sample_size,
      format,
    };
  }

  const latest = await loadLatestCalibration(query, PREDICTION_MODELS.PREMATCH);
  if (latest) {
    return {
      slope: Number(latest.slope),
      intercept: Number(latest.intercept),
      source: latest.source,
      fittedAt: latest.created_at,
      sampleSize: latest.sample_size,
      format,
    };
  }
  return {
    slope: Number.isFinite(envSlope) ? envSlope : 1,
    intercept: Number.isFinite(envIntercept) ? envIntercept : 0,
    source: 'env_default',
    format,
  };
}

function nearlyEqual(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

export async function refitPrematchWeights(query) {
  if (LOCKED) return { applied: false, reason: 'locked' };
  const outcomes = await loadSettledPrematchOutcomes(query);
  const fit = fitPrematchWeights(outcomes, { minSamples: WEIGHT_MIN_SAMPLES });
  if (!fit.applied) return fit;
  const previous = await loadLatestCalibration(query, PREDICTION_MODELS.PREMATCH_WEIGHTS);
  const prevWeights = previous?.params?.weights;
  if (
    prevWeights &&
    EDGE_KEYS_EQUAL(prevWeights, fit.weights)
  ) {
    return { applied: false, reason: 'unchanged', ...fit };
  }
  const id = await saveCalibration(
    query,
    {
      slope: 1,
      intercept: 0,
      sampleSize: fit.sampleSize,
      brierScore: fit.brierScore,
      accuracy: fit.accuracy,
    },
    {
      modelVersion: PREDICTION_MODELS.PREMATCH_WEIGHTS,
      source: 'auto_weights',
      params: { weights: fit.weights },
    },
  );
  return { ...fit, id };
}

function EDGE_KEYS_EQUAL(a, b) {
  const keys = ['form', 'h2h', 'table', 'venue', 'toss', 'conditions', 'xi'];
  return keys.every((key) => nearlyEqual(a?.[key] ?? 0, b?.[key] ?? 0));
}

export async function recalibratePrematch(query, format = null) {
  if (LOCKED) {
    return { applied: false, reason: 'locked' };
  }
  const outcomes = await loadSettledPrematchOutcomes(query);
  const scoped = format
    ? outcomes.filter((row) => (row.format || 'unknown') === format)
    : outcomes;
  const modelVersion = format
    ? formatModelVersion(PREDICTION_MODELS.PREMATCH, format)
    : PREDICTION_MODELS.PREMATCH;
  const fit = fitPlattCalibration(scoped, { minSamples: MIN_SAMPLES });
  if (!fit.applied) return { ...fit, format, modelVersion };
  const previous = await loadLatestCalibration(query, modelVersion);
  if (
    previous &&
    nearlyEqual(previous.slope, fit.slope) &&
    nearlyEqual(previous.intercept, fit.intercept)
  ) {
    return { applied: false, reason: 'unchanged', format, modelVersion, ...fit };
  }
  const id = await saveCalibration(query, fit, {
    modelVersion,
    source: format ? `auto_${format}` : 'auto',
    params: { format: format ?? 'all' },
  });
  return { ...fit, id, format, modelVersion };
}

export async function recalibrateAllFormats(query) {
  const global = await recalibratePrematch(query, null);
  const byFormat = [];
  for (const format of FORMATS.filter((f) => f !== 'unknown')) {
    byFormat.push(await recalibratePrematch(query, format));
  }
  const weights = await refitPrematchWeights(query);
  const liveScales = await refitLiveScales(query);
  return { global, byFormat, weights, liveScales };
}

async function loadSettledLiveMargins(query) {
  const r = await query(
    `SELECT res.explanation, feat.snapshot
     FROM matches m
     JOIN prediction_runs run
       ON run.match_id = m.match_id
      AND run.stage = 'live'
      AND run.model_version = $1
     JOIN prediction_results res ON res.run_id = run.id
     LEFT JOIN prediction_features feat ON feat.run_id = run.id
     WHERE m.status = 'completed'
     ORDER BY run.created_at DESC
     LIMIT 500`,
    [PREDICTION_MODELS.LIVE],
  );
  return r.rows.map((row) => {
    const explanation = row.explanation ?? {};
    const snapshot = row.snapshot ?? {};
    return {
      inning: Number(explanation.inning ?? snapshot.currentInning ?? 1),
      margin:
        explanation.requiredRuns != null
          ? Number(explanation.requiredRuns)
          : Number(explanation.projectedTotal ?? 0) - Number(snapshot.parScore ?? 160),
    };
  });
}

export async function refitLiveScales(query) {
  if (LOCKED) return { applied: false, reason: 'locked' };
  const rows = await loadSettledLiveMargins(query);
  const fit = fitLiveScales(rows);
  if (!fit.applied) return fit;
  const id = await saveCalibration(
    query,
    {
      slope: 1,
      intercept: 0,
      sampleSize: fit.sampleSize,
      brierScore: null,
      accuracy: null,
    },
    {
      modelVersion: PREDICTION_MODELS.LIVE_SCALES,
      stage: PREDICTION_STAGE.LIVE,
      source: 'auto_live_scales',
      params: {
        firstInningsScale: fit.firstInningsScale,
        chaseScale: fit.chaseScale,
        chaseWicketBonus: fit.chaseWicketBonus,
      },
    },
  );
  return { ...fit, id };
}

export async function loadSettledFeatureVectors(query, modelVersion = PREDICTION_MODELS.PREMATCH) {
  const r = await query(
    `SELECT feat.snapshot, rec.payload
     FROM matches m
     JOIN prediction_runs run
       ON run.match_id = m.match_id
      AND run.stage = 'pre_match'
      AND run.model_version = $1
     LEFT JOIN prediction_features feat ON feat.run_id = run.id
     LEFT JOIN LATERAL (
       SELECT payload
       FROM sport_event_records
       WHERE event_id = m.match_id
       ORDER BY updated_at DESC
       LIMIT 1
     ) rec ON true
     WHERE m.status = 'completed'
       AND run.created_at = (
         SELECT MAX(r2.created_at)
         FROM prediction_runs r2
         WHERE r2.match_id = m.match_id
           AND r2.stage = 'pre_match'
           AND r2.model_version = $1
       )`,
    [modelVersion],
  );

  return r.rows.flatMap((row) => {
    const snapshot = row.snapshot ?? {};
    const homeTeamId = snapshot.homeTeamId ?? null;
    const awayTeamId = snapshot.awayTeamId ?? null;
    const actualWinnerId = extractWinnerId(row.payload, [homeTeamId, awayTeamId].filter(Boolean));
    if (!actualWinnerId || !homeTeamId || !awayTeamId) return [];
    const vector = featureVectorFromSnapshot(snapshot);
    return [
      {
        format: String(snapshot.format ?? 'unknown'),
        features: vector.values,
        names: vector.names,
        homeWon: actualWinnerId === homeTeamId,
      },
    ];
  });
}

export async function loadLatestWeights(query, format, modelVersion = PREDICTION_MODELS.PREMATCH) {
  const r = await query(
    `SELECT weights, intercept, sample_size, brier_score, accuracy, source, created_at
     FROM prediction_model_weights
     WHERE model_version = $1 AND stage = $2 AND format = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [modelVersion, PREDICTION_STAGE.PRE_MATCH, format],
  );
  return r.rows[0] ?? null;
}

export async function saveModelWeights(
  query,
  fit,
  { format, modelVersion = PREDICTION_MODELS.PREMATCH, source = 'auto' } = {},
) {
  const id = randomUUID();
  await query(
    `INSERT INTO prediction_model_weights
       (id, model_version, stage, format, weights, intercept,
        sample_size, brier_score, accuracy, source, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      id,
      modelVersion,
      PREDICTION_STAGE.PRE_MATCH,
      format,
      JSON.stringify(fit.weights),
      fit.intercept,
      fit.sampleSize,
      fit.brierScore ?? null,
      fit.accuracy ?? null,
      source,
    ],
  );
  return id;
}

function weightsNearlyEqual(a, b) {
  if (!a || typeof a !== 'object' || !b || typeof b !== 'object') return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (Math.abs(Number(a[key] ?? 0) - Number(b[key] ?? 0)) >= 0.01) return false;
  }
  return true;
}

export async function rescaleWeights(query) {
  if (WEIGHTS_LOCKED) {
    return { applied: false, reason: 'locked' };
  }
  const vectors = await loadSettledFeatureVectors(query);
  const byFormat = new Map();
  for (const vector of vectors) {
    const list = byFormat.get(vector.format) ?? [];
    list.push(vector);
    byFormat.set(vector.format, list);
  }

  const refits = [];
  for (const [format, rows] of byFormat) {
    const fit = fitWeights(rows, { minSamples: WEIGHTS_MIN_SAMPLES });
    if (!fit.applied) continue;
    const previous = await loadLatestWeights(query, format);
    if (
      previous &&
      weightsNearlyEqual(previous.weights, fit.weights) &&
      Math.abs(Number(previous.intercept) - fit.intercept) < 0.01
    ) {
      refits.push({ ...fit, format, applied: false, reason: 'unchanged' });
      continue;
    }
    const id = await saveModelWeights(query, fit, { format });
    refits.push({ format, applied: true, id, ...fit });
  }

  return { applied: refits.length > 0, refits };
}
