#!/usr/bin/env node
/**
 * One-shot PSL sync into Postgres + Redis (standings, fixtures, leaders, squads).
 * Use after deploy or when the API/assistant report missing PSL rows.
 */
import { syncPsAll } from '../src/pslSync.js';
import { shutdown as shutdownDb } from '../src/db.js';
import { shutdown as shutdownRedis } from '../src/redis.js';

const seasons = process.env.PSL_SEASONS;
console.log('[sync-psl] starting', { seasons: seasons ?? '(all configured seasons)' });

try {
  const results = await syncPsAll(seasons);
  console.log('[sync-psl] done', results);
} catch (err) {
  console.error('[sync-psl] failed', err.message);
  process.exitCode = 1;
} finally {
  await shutdownRedis();
  await shutdownDb();
}
