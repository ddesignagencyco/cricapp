import { randomUUID } from 'node:crypto';
import pool from './db.js';

export async function persistPrediction(query, { matchId, stage, modelVersion, snapshot, result }) {
  const id = randomUUID();
  const client = pool ? await pool.connect() : null;
  const run = client ? client.query.bind(client) : query;
  try {
    await run('BEGIN');
    await run(
      `INSERT INTO prediction_runs (id, match_id, stage, model_version, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, matchId, stage, modelVersion],
    );
    await run(
      `INSERT INTO prediction_features (run_id, snapshot) VALUES ($1, $2::jsonb)`,
      [id, JSON.stringify(snapshot)],
    );
    await run(
      `INSERT INTO prediction_results
         (run_id, home_win_prob, away_win_prob, confidence, calibration_band,
          explanation, score_range, top_batters, top_bowlers, xi,
          momentum, pressure_index, partnership_projection, wicket_risk)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb,
               $10::jsonb, $11, $12, $13::jsonb, $14)`,
      [
        id,
        result.homeWinProb,
        result.awayWinProb,
        result.confidence,
        result.calibrationBand ?? 'low',
        JSON.stringify(result.explanation ?? {}),
        JSON.stringify(result.scoreRange ?? null),
        JSON.stringify(result.topBatters ?? []),
        JSON.stringify(result.topBowlers ?? []),
        JSON.stringify(result.xi ?? null),
        result.momentum ?? null,
        result.pressureIndex ?? null,
        JSON.stringify(result.partnershipProjection ?? null),
        result.wicketRisk ?? null,
      ],
    );
    await run('COMMIT');
  } catch (err) {
    try {
      await run('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw err;
  } finally {
    client?.release();
  }
  return id;
}

export async function latestLiveResult(query, matchId) {
  const r = await query(
    `SELECT res.home_win_prob, res.away_win_prob
     FROM prediction_runs run
     JOIN prediction_results res ON res.run_id = run.id
     WHERE run.match_id = $1 AND run.stage = 'live'
     ORDER BY run.created_at DESC
     LIMIT 1`,
    [matchId],
  );
  const row = r.rows[0];
  if (!row) return null;
  return { homeWinProb: row.home_win_prob, awayWinProb: row.away_win_prob };
}

export async function latestFeatureSnapshot(query, matchId, stage, modelVersion) {
  const r = await query(
    `SELECT features.snapshot
     FROM prediction_runs runs
     JOIN prediction_features features ON features.run_id = runs.id
     WHERE runs.match_id = $1 AND runs.stage = $2 AND runs.model_version = $3
     ORDER BY runs.created_at DESC
     LIMIT 1`,
    [matchId, stage, modelVersion],
  );
  return r.rows[0]?.snapshot ?? null;
}
