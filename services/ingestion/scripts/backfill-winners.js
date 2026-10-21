/**
 * Fill matches.winner_id where Sportradar sent a result line but no winner_id.
 *
 * Ingestion now resolves the winner from the result text on every write
 * (resolveWinnerId); this script repairs rows stored before that change. It only
 * fills empty winners, never overwrites one, so it is safe to run more than once.
 *
 *   node --env-file=.env scripts/backfill-winners.js          # dry run
 *   node --env-file=.env scripts/backfill-winners.js --apply  # write
 */
import pg from 'pg';
import { winnerFromResultText } from '@cricapp/shared-types';

const apply = process.argv.includes('--apply');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows } = await client.query(
  `SELECT match_id, team_scores, result_text
     FROM matches
    WHERE status = 'completed' AND winner_id IS NULL AND result_text IS NOT NULL AND team_scores IS NOT NULL`,
);

const updates = [];
for (const row of rows) {
  const sides = [row.team_scores?.home, row.team_scores?.away].filter((s) => s?.id);
  const competitors = sides.map((s) => ({ id: s.id, name: s.name, abbreviation: s.code }));
  const winner = winnerFromResultText(row.result_text, competitors);
  if (winner) updates.push({ id: row.match_id, winner, text: row.result_text });
}

console.log(`${rows.length} finished matches without a winner; ${updates.length} resolved from the result text.`);
for (const u of updates.slice(0, 5)) console.log(`  ${u.id}: "${u.text}" -> ${u.winner}`);

if (apply && updates.length) {
  await client.query('BEGIN');
  for (const u of updates) {
    await client.query('UPDATE matches SET winner_id = $2 WHERE match_id = $1 AND winner_id IS NULL', [u.id, u.winner]);
  }
  await client.query('COMMIT');
  console.log(`Updated ${updates.length} rows.`);
} else if (!apply) {
  console.log('Dry run: add --apply to write.');
}
await client.end();
