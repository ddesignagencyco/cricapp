import { query, shutdown } from '../src/db.js';
import { extractWinnerId } from '../src/features.js';

const r = await query(`
  SELECT m.match_id, m.venue, m.tournament, m.scheduled, rec.payload
  FROM matches m
  LEFT JOIN LATERAL (
    SELECT payload FROM sport_event_records
    WHERE event_id = m.match_id
    ORDER BY updated_at DESC LIMIT 1
  ) rec ON true
  WHERE m.status = 'completed'
  ORDER BY m.scheduled DESC
  LIMIT 400`);

let withWinner = 0;
let withToss = 0;
let both = 0;
const tossDecisions = new Set();
for (const row of r.rows) {
  const p = row.payload;
  const w = extractWinnerId(p, []);
  const status = p?.sport_event_status ?? {};
  const t = status.toss_won_by ?? null;
  if (w) withWinner += 1;
  if (t) {
    withToss += 1;
    tossDecisions.add(String(status.toss_decision ?? ''));
  }
  if (w && t) both += 1;
}
console.log({ total: r.rows.length, withWinner, withToss, both, decisions: [...tossDecisions] });

const kinds = await query(`
  SELECT kind, count(*) FROM sport_event_records GROUP BY kind ORDER BY 2 DESC LIMIT 10`);
console.log(kinds.rows);

const sample = r.rows.find((row) => row.payload?.sport_event_status?.winner_id);
if (sample) console.log(JSON.stringify(sample.payload.sport_event_status));
const sampleToss = r.rows.find((row) => row.payload?.sport_event_status?.toss_won_by);
if (sampleToss) console.log(JSON.stringify(sampleToss.payload.sport_event_status));
await shutdown();