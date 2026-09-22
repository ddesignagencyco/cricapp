#!/usr/bin/env node
import { syncTourCatalog } from '../src/refSync.js';
import { shutdown as shutdownDb } from '../src/db.js';
import { shutdown as shutdownRedis } from '../src/redis.js';

try {
  const result = await syncTourCatalog({ force: true });
  console.log('[sync-tour-catalog] done', result);
} catch (err) {
  console.error('[sync-tour-catalog] failed', err.message);
  process.exitCode = 1;
} finally {
  await shutdownRedis();
  await shutdownDb();
}
