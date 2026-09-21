/**
 * Compare Sportradar cricket-t2 responses with what we persist in Postgres.
 *
 * Usage (from repo root or services/ingestion):
 *   node --env-file-if-exists=.env scripts/audit-provider-coverage.js
 *   node --env-file-if-exists=.env scripts/audit-provider-coverage.js sr:match:123
 */
import pg from 'pg';
import {
  fetchMatchSummary,
  fetchMatchTimeline,
  fetchMatchLineups,
} from '../src/sportradar.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function topKeys(obj) {
  return obj && typeof obj === 'object' ? Object.keys(obj).sort() : [];
}

function missingKeys(apiObj, dbObj) {
  const api = topKeys(apiObj);
  const db = new Set(topKeys(dbObj));
  return api.filter((k) => !db.has(k));
}

async function loadRecord(client, kind, eventId) {
  const r = await client.query(
    `SELECT payload FROM sport_event_records
     WHERE kind = $1 AND event_id = $2
     ORDER BY updated_at DESC LIMIT 1`,
    [kind, eventId],
  );
  return r.rows[0]?.payload ?? null;
}

async function loadTimeline(client, matchId) {
  const r = await client.query(
    `SELECT payload FROM match_timelines WHERE match_id = $1 LIMIT 1`,
    [matchId],
  );
  return r.rows[0]?.payload ?? null;
}

async function pickSampleMatchId(client) {
  const r = await client.query(
    `SELECT event_id FROM sport_event_records
     WHERE event_id IS NOT NULL
     ORDER BY scheduled DESC NULLS LAST
     LIMIT 1`,
  );
  return r.rows[0]?.event_id ?? null;
}

async function countByKind(client) {
  const r = await client.query(
    `SELECT kind, COUNT(*)::int AS n FROM sport_event_records GROUP BY kind ORDER BY kind`,
  );
  return r.rows;
}

async function main() {
  const matchId = process.argv[2] || null;
  const client = await pool.connect();
  try {
    console.log('=== sport_event_records by kind ===');
    for (const row of await countByKind(client)) {
      console.log(`  ${row.kind.padEnd(22)} ${row.n}`);
    }
    const tl = await client.query(`SELECT COUNT(*)::int AS n FROM match_timelines`);
    console.log(`  ${'match_timelines'.padEnd(22)} ${tl.rows[0].n}`);

    const id = matchId || (await pickSampleMatchId(client));
    if (!id) {
      console.log('\nNo match id in DB — pass sr:match:... as argv[2]');
      return;
    }
    console.log(`\n=== match ${id} ===`);

    let apiSummary;
    try {
      apiSummary = await fetchMatchSummary(id);
    } catch (err) {
      console.log(`API summary failed: ${err.message}`);
      apiSummary = null;
    }

    const dbSummary = await loadRecord(client, 'match_summary', id);
    const dbSchedule = await loadRecord(client, 'daily_schedule', id);
    const dbResults = await loadRecord(client, 'daily_results', id);
    const dbLineup = await loadRecord(client, 'match_lineup', id);
    const dbTimeline = await loadTimeline(client, id);

    if (apiSummary) {
      console.log('\nMatch summary (API top-level keys):', topKeys(apiSummary).join(', '));
      if (dbSummary) {
        const miss = missingKeys(apiSummary, dbSummary);
        console.log(
          miss.length
            ? `  match_summary DB missing vs API: ${miss.join(', ')}`
            : '  match_summary DB has all API top-level keys',
        );
      } else {
        console.log('  match_summary: NOT IN DB (only daily_schedule/results may exist)');
      }
      if (dbSchedule) {
        const schedPayload = dbSchedule?.sport_event ? dbSchedule : { sport_event: dbSchedule };
        const missSched = missingKeys(apiSummary, schedPayload);
        if (missSched.length) {
          console.log(`  daily_schedule thinner than summary API: missing ${missSched.join(', ')}`);
        }
      }
    }

    try {
      const apiTimeline = await fetchMatchTimeline(id);
      const apiKeys = topKeys(apiTimeline);
      console.log('\nTimeline API keys:', apiKeys.join(', '));
      if (dbTimeline) {
        const miss = missingKeys(apiTimeline, dbTimeline);
        console.log(
          miss.length
            ? `  match_timelines DB missing vs API: ${miss.join(', ')}`
            : '  match_timelines has all API top-level keys',
        );
      } else {
        console.log('  match_timelines: NOT IN DB');
      }
    } catch (err) {
      console.log(`\nTimeline API: ${err.message}`);
    }

    try {
      const apiLineup = await fetchMatchLineups(id);
      console.log('\nLineups API keys:', topKeys(apiLineup).join(', '));
      if (dbLineup) {
        const miss = missingKeys(apiLineup, dbLineup);
        console.log(
          miss.length
            ? `  match_lineup DB missing vs API: ${miss.join(', ')}`
            : '  match_lineup has all API top-level keys',
        );
      } else {
        console.log('  match_lineup: NOT IN DB');
      }
    } catch (err) {
      console.log(`\nLineups API: ${err.message}`);
    }

    if (dbResults && !dbSummary) {
      console.log('\nNote: daily_results row exists but match_summary does not — ref sync summary queue should backfill.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
