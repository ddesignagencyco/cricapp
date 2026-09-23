import { randomUUID } from 'node:crypto';
import { PREDICTION_MODELS, PREDICTION_STAGE } from '@cricapp/shared-types';
import { extractWinnerId } from './features.js';
import { featureVectorFromSnapshot } from './prematch.js';
import { fitPlattCalibration, fitWeights } from './settle.js';

const MIN_SAMPLES = Number(process.env.CALIBRATION_MIN_SAMPLES || 8);
const LOCKED = String(process.env.PREMATCH_CALIBRATION_LOCKED || '').toLowerCase() === 'true';
const WEIGHTS_LOCKED = String(process.env.PREDICTION_WEIGHTS_LOCKED || '').toLowerCase() === 'true';
const WEIGHTS_MIN_SAMPLES = Number(process.env.WEIGHTS_MIN_SAMPLES || 20);

export async function loadLatestCalibration(query, modelVersion = PREDICTION_MODELS.PREMATCH) {
  try {
    const r = await query(
      `SELECT slope, intercept, sample_size, brier_score, accuracy, source, created_at
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

export async function saveCalibration(query, fit, { modelVersion = PREDICTION_MODELS.PREMATCH, source = 'auto' } = {}) {
  const id = randomUUID();
  await query(
    `INSERT INTO prediction_calibrations
       (id, model_version, stage, slope, intercept, sample_size, brier_score, accuracy, source, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [
      id,
      modelVersion,
      PREDICTION_STAGE.PRE_MATCH,
      fit.slope,
      fit.intercept,
      fit.sampleSize,
      fit.brierScore ?? null,
      fit.accuracy ?? null,
      source,
    ],
  );
  return id;
}

export async function loadSettledPrematchOutcomes(query, modelVersion = PREDICTION_MODELS.PREMATCH) {
  const r = await query(
    `SELECT res.home_win_prob, res.explanation, feat.snapshot, rec.payload
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
      },
    ];
  });
}

export async function resolvePrematchCalibration(query) {
  const envSlope = Number(process.env.PREMATCH_CALIBRATION_SLOPE);
  const envIntercept = Number(process.env.PREMATCH_CALIBRATION_INTERCEPT);
  if (LOCKED && Number.isFinite(envSlope) && Number.isFinite(envIntercept)) {
    return { slope: envSlope, intercept: envIntercept, source: 'env_locked' };
  }
  const latest = await loadLatestCalibration(query);
  if (latest) {
    return {
      slope: Number(latest.slope),
      intercept: Number(latest.intercept),
      source: latest.source,
      fittedAt: latest.created_at,
      sampleSize: latest.sample_size,
    };
  }
  return {
    slope: Number.isFinite(envSlope) ? envSlope : 1,
    intercept: Number.isFinite(envIntercept) ? envIntercept : 0,
    source: 'env_default',
  };
}

function nearlyEqual(a, b) {
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

export async function recalibratePrematch(query) {
  if (LOCKED) {
    return { applied: false, reason: 'locked' };
  }
  const outcomes = await loadSettledPrematchOutcomes(query);
  const fit = fitPlattCalibration(outcomes, { minSamples: MIN_SAMPLES });
  if (!fit.applied) return fit;
  const previous = await loadLatestCalibration(query);
  if (
    previous &&
    nearlyEqual(previous.slope, fit.slope) &&
    nearlyEqual(previous.intercept, fit.intercept)
  ) {
    return { applied: false, reason: 'unchanged', ...fit };
  }
  const id = await saveCalibration(query, fit);
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

export async function resolvePrematchWeights(query, modelVersion = PREDICTION_MODELS.PREMATCH) {
  const r = await query(
    `SELECT DISTINCT ON (format) format, weights, intercept, source, created_at
     FROM prediction_model_weights
     WHERE model_version = $1 AND stage = $2
     ORDER BY format, created_at DESC`,
    [modelVersion, PREDICTION_STAGE.PRE_MATCH],
  );
  if (r.rows.length === 0) return null;
  const byFormat = {};
  for (const row of r.rows) {
    byFormat[row.format] = {
      weights: row.weights,
      intercept: Number(row.intercept),
    };
  }
  return {
    byFormat,
    source: r.rows[0].source,
    fittedAt: r.rows[0].created_at,
  };
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
