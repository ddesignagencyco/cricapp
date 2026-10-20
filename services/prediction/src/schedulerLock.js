import pg from 'pg';

/**
 * One prediction writer at a time.
 *
 * Two schedulers can score matches: this long-running worker and the pg_cron-driven
 * Supabase edge function (`supabase/functions/prediction-run`). Both wrote live,
 * pre-match and calibration rows with no coordination, so rows were duplicated and a
 * card could flip between the two writers' numbers.
 *
 * The worker holds a Postgres session advisory lock for its whole life. The edge
 * function only *probes* it and skips its run while the worker is up, so whichever
 * deployment is in use — worker, cron, or both — exactly one of them writes. Nothing is
 * stored: no table, no migration.
 */
export const PREDICTION_WORKER_LOCK_KEY = 7303011;

/**
 * True while a worker holds the lock. A single statement, so it also works through a
 * transaction pooler: if the lock is free it is taken and released in the same call.
 */
export async function workerIsActive(query) {
  const r = await query(
    `SELECT CASE WHEN pg_try_advisory_lock($1) THEN NOT pg_advisory_unlock($1) ELSE true END AS active`,
    [PREDICTION_WORKER_LOCK_KEY],
  );
  return r.rows[0]?.active === true;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Takes the lock on a dedicated connection and keeps it until the process exits.
 *
 * Session advisory locks need a real session, so this prefers `PREDICTION_LOCK_DATABASE_URL`
 * or `DIRECT_URL` (direct / session-mode connection) over a transaction-pooled
 * `DATABASE_URL`. A short retry covers the edge function's momentary probe; a lock that
 * stays held means another worker is already running, and this one must not start.
 */
export async function acquireWorkerLock({ log, attempts = 5, delayMs = 2000 } = {}) {
  const connectionString =
    process.env.PREDICTION_LOCK_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;
  const client = new pg.Client({ connectionString });
  await client.connect();
  // Losing this connection releases the lock, after which the edge function would start
  // writing alongside us. Exit instead, so the supervisor restarts a clean worker.
  client.on('error', (err) => {
    log?.error('scheduler lock connection lost — exiting', { error: err.message });
    process.exit(1);
  });

  for (let i = 0; i < attempts; i += 1) {
    const r = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [PREDICTION_WORKER_LOCK_KEY]);
    if (r.rows[0]?.locked) {
      log?.info('scheduler lock acquired — this worker is the only prediction writer');
      return {
        release: async () => {
          await client.query('SELECT pg_advisory_unlock($1)', [PREDICTION_WORKER_LOCK_KEY]).catch(() => {});
          await client.end().catch(() => {});
        },
      };
    }
    await sleep(delayMs);
  }
  await client.end().catch(() => {});
  throw new Error('another prediction worker already holds the scheduler lock');
}
