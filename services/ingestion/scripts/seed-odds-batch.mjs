/**
 * Seed demo licensed odds for several matches (dev only).
 * Usage: node --env-file-if-exists=.env scripts/seed-odds-batch.mjs [limit]
 */
import pg from 'pg';
import { seedMatchWinnerSnapshots } from '../src/oddsStore.js';

const limit = Math.min(Number(process.argv[2] || 5), 20);
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

const { rows } = await client.query(
  `SELECT match_id, team_names
   FROM matches
   WHERE status IN ('upcoming', 'live')
   ORDER BY scheduled DESC NULLS LAST
   LIMIT $1`,
  [limit],
);

if (rows.length === 0) {
  const fallback = await client.query(
    `SELECT match_id, team_names FROM matches ORDER BY updated_at DESC LIMIT $1`,
    [limit],
  );
  rows.push(...fallback.rows);
}

await client.end();

if (rows.length === 0) {
  console.error('No matches in database');
  process.exit(1);
}

const now = new Date();
const hourAgo = new Date(Date.now() - 3600000);

/** Slightly different lines per row so comparisons look realistic. */
function linesForIndex(i) {
  const base = 1.82 + (i % 4) * 0.03;
  return {
    openHome: base,
    openAway: 2.08 - (i % 3) * 0.04,
    nowHome: base + 0.05,
    nowAway: 2.0 - (i % 2) * 0.06,
    altHome: base + 0.02,
    altAway: 2.12,
  };
}

for (let i = 0; i < rows.length; i += 1) {
  const { match_id: matchId, team_names: teamNames } = rows[i];
  const names = Array.isArray(teamNames) ? teamNames : [];
  const L = linesForIndex(i);

  await seedMatchWinnerSnapshots({
    matchId,
    sourceSlug: 'demo-book-a',
    sourceName: 'Demo Book A (dev)',
    homeDecimal: L.openHome,
    awayDecimal: L.openAway,
    capturedAt: hourAgo,
  });
  await seedMatchWinnerSnapshots({
    matchId,
    sourceSlug: 'demo-book-a',
    sourceName: 'Demo Book A (dev)',
    homeDecimal: L.nowHome,
    awayDecimal: L.nowAway,
    capturedAt: now,
  });
  await seedMatchWinnerSnapshots({
    matchId,
    sourceSlug: 'demo-book-b',
    sourceName: 'Demo Book B (dev)',
    homeDecimal: L.altHome,
    awayDecimal: L.altAway,
    capturedAt: now,
  });

  console.log(`${matchId}  ${names[0] ?? '?'} vs ${names[1] ?? '?'}`);
}

console.log(`\nSeeded demo odds for ${rows.length} match(es).`);
console.log('Try: GET /api/odds/<matchId>  (encode matchId if using a browser)');
