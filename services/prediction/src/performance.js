import { randomUUID } from 'node:crypto';
import { extractWinnerId } from './features.js';
import { brierScore, predictedFavorite } from './settle.js';

export function settledRunsQuery({ stage }) {
  const liveFilter =
    stage === 'live'
      ? `AND COALESCE(res.explanation->'reasons' @> '["match_decided"]', false) IS NOT TRUE`
      : '';
  return `
    SELECT DISTINCT ON (run.match_id)
      run.match_id,
      res.home_win_prob,
      res.confidence,
      feat.snapshot,
      rec.payload
    FROM prediction_runs run
    JOIN prediction_results res ON res.run_id = run.id
    LEFT JOIN prediction_features feat ON feat.run_id = run.id
    LEFT JOIN LATERAL (
      SELECT payload
      FROM sport_event_records
      WHERE event_id = run.match_id
      ORDER BY updated_at DESC
      LIMIT 1
    ) rec ON true
    JOIN matches m ON m.match_id = run.match_id
    WHERE run.stage = $1
      AND run.model_version = $2
      AND m.status = 'completed'
      ${liveFilter}
    ORDER BY run.match_id, run.created_at DESC
  `;
}

export function computePerformanceStats(rows, { bins = 10 } = {}) {
  const binCount = Math.min(20, Math.max(5, Number(bins) || 10));
  const buckets = Array.from({ length: binCount }, (_, index) => ({
    index,
    predictedTotal: 0,
    actualTotal: 0,
    sampleSize: 0,
  }));
  const byFormat = new Map();
  const byConfidence = new Map();
  let correct = 0;
  let brierTotal = 0;
  let sampleSize = 0;

  for (const row of rows) {
    const snapshot = row.snapshot ?? {};
    const homeTeamId = String(snapshot.homeTeamId ?? '');
    const awayTeamId = String(snapshot.awayTeamId ?? '');
    const actualWinnerId = extractWinnerId(row.payload, [homeTeamId, awayTeamId].filter(Boolean));
    if (!actualWinnerId || !homeTeamId || !awayTeamId) continue;

    const homeWinProb = Number(row.home_win_prob);
    if (!Number.isFinite(homeWinProb)) continue;
    const confidence = Number(row.confidence);
    const homeWon = actualWinnerId === homeTeamId;
    const favorite = predictedFavorite(homeTeamId, awayTeamId, homeWinProb);
    const hit = favorite === actualWinnerId;
    const brier = brierScore(homeWinProb, homeWon);

    sampleSize += 1;
    if (hit) correct += 1;
    brierTotal += brier;

    const probability = Math.max(homeWinProb, 1 - homeWinProb);
    const bucket = buckets[Math.min(binCount - 1, Math.floor(probability * binCount))];
    bucket.predictedTotal += probability;
    bucket.actualTotal += hit ? 1 : 0;
    bucket.sampleSize += 1;

    const format = String(snapshot.format ?? 'unknown');
    const formatBucket = byFormat.get(format) ?? { sampleSize: 0, correct: 0, brier: 0 };
    formatBucket.sampleSize += 1;
    if (hit) formatBucket.correct += 1;
    formatBucket.brier += brier;
    byFormat.set(format, formatBucket);

    const band = confidence >= 0.75 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
    const confidenceBucket = byConfidence.get(band) ?? { sampleSize: 0, correct: 0, brier: 0 };
    confidenceBucket.sampleSize += 1;
    if (hit) confidenceBucket.correct += 1;
    confidenceBucket.brier += brier;
    byConfidence.set(band, confidenceBucket);
  }

  if (sampleSize === 0) return null;

  const populated = buckets
    .filter((bucket) => bucket.sampleSize > 0)
    .map((bucket) => {
      const meanPredicted = bucket.predictedTotal / bucket.sampleSize;
      const actualRate = bucket.actualTotal / bucket.sampleSize;
      return {
        minProbability: Number((bucket.index / binCount).toFixed(4)),
        maxProbability: Number(((bucket.index + 1) / binCount).toFixed(4)),
        sampleSize: bucket.sampleSize,
        meanPredicted: Number(meanPredicted.toFixed(4)),
        actualRate: Number(actualRate.toFixed(4)),
        calibrationError: Number(Math.abs(meanPredicted - actualRate).toFixed(4)),
      };
    });

  return {
    sampleSize,
    accuracy: sampleSize ? Number((correct / sampleSize).toFixed(4)) : null,
    brierScore: sampleSize ? Number((brierTotal / sampleSize).toFixed(4)) : null,
    expectedCalibrationError:
      sampleSize && populated.length > 0
        ? Number(
            (
              populated.reduce(
                (sum, bucket) => sum + bucket.calibrationError * bucket.sampleSize,
                0,
              ) / sampleSize
            ).toFixed(4),
          )
        : null,
    byFormat: [...byFormat.entries()].map(([format, value]) => ({
      format,
      sampleSize: value.sampleSize,
      accuracy: Number((value.correct / value.sampleSize).toFixed(4)),
      brierScore: Number((value.brier / value.sampleSize).toFixed(4)),
    })),
    byConfidenceBand: [...byConfidence.entries()].map(([band, value]) => ({
      band,
      sampleSize: value.sampleSize,
      accuracy: Number((value.correct / value.sampleSize).toFixed(4)),
      brierScore: Number((value.brier / value.sampleSize).toFixed(4)),
    })),
  };
}

export async function recordPerformanceSnapshot(
  query,
  stats,
  { modelVersion, stage, source = 'auto' } = {},
) {
  const id = randomUUID();
  await query(
    `INSERT INTO prediction_performance_snapshots
       (id, model_version, stage, sample_size, accuracy, brier_score,
        expected_calibration_error, by_format, by_confidence, source, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      id,
      modelVersion,
      stage,
      stats.sampleSize,
      stats.accuracy,
      stats.brierScore,
      stats.expectedCalibrationError,
      JSON.stringify(stats.byFormat),
      JSON.stringify(stats.byConfidenceBand),
      source,
    ],
  );
  return id;
}

export async function snapshotPerformance(query, { modelVersion, stage, source = 'auto', bins = 10 } = {}) {
  const r = await query(settledRunsQuery({ stage }), [stage, modelVersion]);
  const stats = computePerformanceStats(r.rows, { bins });
  if (!stats || stats.sampleSize === 0) {
    return { applied: false, reason: 'insufficient_sample', sampleSize: 0 };
  }
  const id = await recordPerformanceSnapshot(query, stats, { modelVersion, stage, source });
  return { applied: true, id, stats };
}