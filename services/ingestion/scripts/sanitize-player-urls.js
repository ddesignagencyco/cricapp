/**
 * Remove mistaken app page URLs stored in profile_url.
 */
import { query, shutdown as shutdownDb } from '../src/db.js';
import { shutdown as shutdownRedis } from '../src/redis.js';

const r = await query(
  `UPDATE players SET
     profile_url = CASE WHEN profile_url LIKE '%/players/sr%' THEN NULL ELSE profile_url END,
     updated_at = NOW()
   WHERE profile_url LIKE '%/players/sr%'`,
);
console.log(`sanitized ${r.rowCount ?? 0} player row(s)`);
await shutdownRedis();
await shutdownDb();
