/**
 * Fill blank team scores on completed matches from the scorecards already stored in match_timelines
 * (no provider requests). Safe to re-run: only rows with no score on either side are touched.
 *
 *   node --env-file=.env scripts/backfill-scores.js [--dry]
 */
import { query, shutdown } from '../src/db.js';
import { normalizeMatch } from '../src/normalize.js';
import { PROVIDERS } from '../src/schemas.js';
import { saveMatch } from '../src/store.js';

const dry = process.argv.includes('--dry');
const rows = (await query(
  `SELECT m.match_id, t.payload
     FROM matches m JOIN match_timelines t ON t.match_id = m.match_id
    WHERE m.status = 'completed'
      AND COALESCE(m.team_scores->'home'->>'score', '') = ''
      AND COALESCE(m.team_scores->'away'->>'score', '') = ''
      AND t.payload ? 'sport_event_status'`,
)).rows;

let fixed = 0;
for (const { match_id, payload } of rows) {
  const n = normalizeMatch(PROVIDERS.SPORTRADAR, { sport_event: payload.sport_event, sport_event_status: payload.sport_event_status, statistics: payload.statistics });
  const has = n.teamScores?.home?.score || n.teamScores?.away?.score;
  if (!has) continue;
  if (!dry) await saveMatch({ ...n, matchId: match_id });
  fixed += 1;
}
console.log(JSON.stringify({ candidates: rows.length, fixed, dry }));
await shutdown();
process.exit(0);
