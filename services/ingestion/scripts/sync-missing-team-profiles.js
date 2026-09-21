/**
 * Fetch team profiles for teams missing country (trial QPS: one call per team).
 * Usage: node --env-file-if-exists=.env scripts/sync-missing-team-profiles.js [limit]
 */
import { query, shutdown as shutdownDb } from '../src/db.js';
import { shutdown as shutdownRedis } from '../src/redis.js';
import { fetchTeamProfile } from '../src/sportradar.js';
import { saveTeamProfile } from '../src/store.js';
import { normalizeTeamProfile } from '../src/reference.js';

const limit = Number(process.argv[2] || 15);
const delayMs = Number(process.env.REF_SYNC_DELAY_MS || 1500);

const r = await query(
  `SELECT id FROM teams WHERE country IS NULL ORDER BY updated_at DESC LIMIT $1`,
  [limit],
);

let ok = 0;
for (const row of r.rows) {
  try {
    const raw = await fetchTeamProfile(row.id);
    const norm = normalizeTeamProfile(row.id, raw);
    await saveTeamProfile(norm);
    ok += 1;
    console.log('profile', row.id);
  } catch (err) {
    console.warn('skip', row.id, err.message);
  }
  await new Promise((res) => setTimeout(res, delayMs));
}

console.log(`synced ${ok}/${r.rows.length}`);
await shutdownRedis();
await shutdownDb();
