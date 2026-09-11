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
         (run_id, home_win_prob, away_win_prob, confidence, explanation, score_range, xi)
       VALUES ($1, $2, $3, $4, $5::jsonb, NULL, NULL)`,
      [
        id,
        result.homeWinProb,
        result.awayWinProb,
        result.confidence,
        JSON.stringify(result.explanation ?? {}),
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
