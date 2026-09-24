/**
 * Read-only audit of match_timelines: row counts, PK/duplicate detection,
 * per-status payload sizes, and duplicate event ids *within* payloads.
 *
 * Usage: node --env-file-if-exists=.env scripts/audit-timeline-duplicates.mjs
 * Prints findings + a safe (dry-run) cleanup proposal. Deletes NOTHING.
 */
import pg from 'pg';

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });

const q = (text, params) => client.query(text, params);

function eventArray(payload) {
  const arr =
    payload?.sport_event_timeline?.timeline ??
    payload?.timeline ??
    payload?.sport_event?.timeline;
  return Array.isArray(arr) ? arr : null;
}

function eventKey(ev) {
  return ev?.id ?? ev?.event_id ?? ev?.uuid ?? ev?.sequence ?? null;
}

async function main() {
  await client.connect();
  try {
    // 1. Constraints on the table (PK? unique match_id?).
    const cons = await q(
      `SELECT conname, contype, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = 'match_timelines'::regclass
       ORDER BY contype`,
    );
    console.log('== constraints ==');
    if (!cons.rows.length) console.log('  (none — table has NO primary key!)');
    for (const c of cons.rows) console.log(`  ${c.contype} ${c.conname}: ${c.def}`);

    // 2. Row counts vs distinct match ids => row-level duplicates.
    const counts = await q(
      `SELECT COUNT(*)::int AS rows, COUNT(DISTINCT match_id)::int AS distinct_ids
       FROM match_timelines`,
    );
    const { rows, distinct_ids } = counts.rows[0];
    console.log('\n== row counts ==');
    console.log(`  rows=${rows} distinct_match_ids=${distinct_ids} row_dups=${rows - distinct_ids}`);

    // 3. Explicit duplicate match_id groups (if the PK is missing).
    const dups = await q(
      `SELECT match_id, COUNT(*)::int AS n
       FROM match_timelines GROUP BY match_id HAVING COUNT(*) > 1
       ORDER BY n DESC LIMIT 20`,
    );
    console.log(`  duplicate match_id groups: ${dups.rows.length}`);
    for (const d of dups.rows) console.log(`    ${d.match_id} x${d.n}`);

    // 4. Storage footprint + churn by match status.
    const sizes = await q(
      `SELECT m.status,
              COUNT(*)::int AS timelines,
              SUM(pg_column_size(mt.payload))::bigint AS bytes,
              MIN(mt.created_at) AS first_created,
              MAX(mt.updated_at) AS last_updated
       FROM match_timelines mt
       LEFT JOIN matches m ON m.match_id = mt.match_id
       GROUP BY m.status
       ORDER BY bytes DESC`,
    );
    console.log('\n== payload bytes by match status ==');
    let totalBytes = 0;
    for (const s of sizes.rows) {
      totalBytes += Number(s.bytes);
      console.log(
        `  status=${s.status ?? '(no matches row)'} timelines=${s.timelines} bytes=${Number(s.bytes)}`,
      );
    }
    const total = await q(
      `SELECT pg_total_relation_size('match_timelines')::bigint AS total_bytes,
              COUNT(*)::int AS n,
              MAX(LENGTH(payload::text))::int AS max_payload_chars,
              AVG(LENGTH(payload::text))::int AS avg_payload_chars
       FROM match_timelines`,
    );
    console.log(
      `  TOTAL on-disk=${Number(total.rows[0].total_bytes)} avg_payload=${total.rows[0].avg_payload_chars}B max_payload=${total.rows[0].max_payload_chars}B`,
    );

    // 5. Duplicate event ids *within* stored payloads (stable event identifier).
    const sample = await q(
      `SELECT match_id, payload FROM match_timelines LIMIT 500`,
    );
    let payloadsChecked = 0;
    let payloadsWithDups = 0;
    let payloadsNoId = 0;
    const examples = [];
    for (const row of sample.rows) {
      const events = eventArray(row.payload);
      if (!events || events.length === 0) continue;
      payloadsChecked += 1;
      const seen = new Map();
      let identified = 0;
      for (const ev of events) {
        const k = eventKey(ev);
        if (k == null) continue;
        identified += 1;
        seen.set(String(k), (seen.get(String(k)) ?? 0) + 1);
      }
      if (identified === 0) payloadsNoId += 1;
      const d = [...seen.entries()].filter(([, n]) => n > 1);
      if (d.length) {
        payloadsWithDups += 1;
        if (examples.length < 5) {
          examples.push({ match_id: row.match_id, dups: d.slice(0, 5) });
        }
      }
    }
    console.log('\n== duplicate event ids within payloads (sample up to 500) ==');
    console.log(
      `  payloads_with_events=${payloadsChecked} with_duplicate_ids=${payloadsWithDups} no_stable_id=${payloadsNoId}`,
    );
    for (const ex of examples) {
      console.log(`    ${ex.match_id}: ${JSON.stringify(ex.dups)}`);
    }

    // 6. Live vs completed split (how many completed rows were touched recently).
    const churn = await q(
      `SELECT m.status, COUNT(*)::int AS n, MAX(mt.updated_at) AS last_touch
       FROM match_timelines mt JOIN matches m ON m.match_id = mt.match_id
       WHERE mt.updated_at > NOW() - INTERVAL '7 days'
       GROUP BY m.status ORDER BY n DESC`,
    );
    console.log('\n== timelines written in last 7 days by match status ==');
    for (const c of churn.rows) console.log(`  status=${c.status} n=${c.n} last=${c.last_touch}`);

    // 7. Safe cleanup proposal (dry-run only — nothing is deleted here).
    console.log('\n== safe cleanup proposal (NOT executed) ==');
    if (rows - distinct_ids > 0) {
      console.log('  Row-level duplicates found. Proposed dedupe (run manually after review):');
      console.log(`    -- keep newest row per match_id, drop older copies:
    DELETE FROM match_timelines mt
    USING (
      SELECT match_id, MAX(updated_at) AS keep_at
      FROM match_timelines GROUP BY match_id HAVING COUNT(*) > 1
    ) d
    WHERE mt.match_id = d.match_id AND mt.updated_at < d.keep_at;`);
    } else {
      console.log('  No row-level duplicates: PK-scoped upserts are holding.');
      console.log('  Growth is payload rewrites + first-time fills, not duplicate rows.');
      console.log('  No deletions required.');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
