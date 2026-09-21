/**
 * Fetch player profiles for rows missing country_code (respects SPORTRADAR QPS).
 * Usage: node --env-file-if-exists=.env scripts/sync-missing-player-profiles.js [limit]
 */
import { query, shutdown as shutdownDb } from '../src/db.js';
import { shutdown as shutdownRedis } from '../src/redis.js';
import { fetchPlayerProfile } from '../src/sportradar.js';
import { savePlayerProfile } from '../src/store.js';
import { normalizePlayerProfile } from '../src/reference.js';

const limit = Number(process.argv[2] || 25);
const delayMs = Number(process.env.REF_SYNC_DELAY_MS || 1500);

const r = await query(
  `SELECT id, team_id FROM players
   WHERE id LIKE 'sr:player:%'
     AND (country_code IS NULL OR batting_style IS NULL OR height IS NULL)
   ORDER BY updated_at DESC
   LIMIT $1`,
  [limit],
);

let ok = 0;
for (const row of r.rows) {
  try {
    const raw = await fetchPlayerProfile(row.id);
    await savePlayerProfile(normalizePlayerProfile(row.id, raw));
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
