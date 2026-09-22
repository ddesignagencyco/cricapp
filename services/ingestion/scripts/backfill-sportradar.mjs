/**
 * One-time (or periodic) Sportradar backfill into Postgres so the read API
 * serves from DB — same payloads as Sportradar web APIs, without per-request calls.
 *
 * Usage (from services/ingestion):
 *   node --env-file-if-exists=.env scripts/backfill-sportradar.mjs
 *
 * Env:
 *   BACKFILL_DAYS=60              — daily schedule/results window
 *   BACKFILL_TIMELINE_MAX=500     — max timeline API calls this run
 *   BACKFILL_TIMELINE_BATCH=40
 *   BACKFILL_DELAY_MS=1100        — pause between Sportradar calls (trial ~1 QPS)
 *   BACKFILL_TEAM_IDS=sr:competitor:…,…  — H2H pairs (defaults to all teams in DB)
 *   BACKFILL_FULL_REF_SYNC=true   — also run refSyncAll (many global seasons; easy 429 on trial)
 *   PSL_SEASONS=2024,2025,2026
 *
 * Check progress anytime: npm run backfill:status
 */
import db, { shutdown as shutdownDb } from '../src/db.js';
import redis, { shutdown as shutdownRedis } from '../src/redis.js';
import { syncPsAll } from '../src/pslSync.js';
import {
  backfillHeadToHead,
  backfillTimelines,
  refSyncAll,
  syncDailyRange,
  syncTournamentResults,
} from '../src/refSync.js';
import { countEventIdsWithoutTimeline, listTeamIds } from '../src/store.js';
import { PSL_SEASONS } from '../src/schemas.js';
import { createLogger } from '../src/logger.js';

const log = createLogger('backfill');

const daysBack = Number(process.env.BACKFILL_DAYS || 45);
const timelineMax = Number(process.env.BACKFILL_TIMELINE_MAX || 500);
const timelineBatch = Number(process.env.BACKFILL_TIMELINE_BATCH || 40);
const delayMs = Number(process.env.BACKFILL_DELAY_MS || 1100);

function parseTeamIds(raw) {
  if (raw?.trim()) {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

async function main() {
  await db.query('SELECT 1');
  await redis.ping();
  log.info('Sportradar backfill starting', {
    daysBack,
    timelineMax,
    delayMs,
  });

  log.info('Step 1/5: PSL standings, fixtures, leaders, squads');
  await syncPsAll(process.env.PSL_SEASONS);

  if (process.env.BACKFILL_FULL_REF_SYNC === 'true') {
    log.info('Step 2/5: full reference sync (global seasons — slow on trial API)');
    await refSyncAll({
      delay: delayMs,
      timelineLimit: 0,
      lineupLimit: 0,
      teamLimit: Number(process.env.BACKFILL_TEAM_PROFILE_LIMIT || 8),
      seasonLimit: Number(process.env.BACKFILL_SEASON_LIMIT || 3),
    });
  } else {
    log.info('Step 2/5: skipped full ref sync (set BACKFILL_FULL_REF_SYNC=true to enable)');
  }

  log.info('Step 3/5: tournament results for each PSL season');
  for (const season of PSL_SEASONS) {
    try {
      await syncTournamentResults(season.id);
    } catch (err) {
      log.warn(`season results ${season.id}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }

  log.info(`Step 4/5: daily schedule + results (${daysBack} days)`);
  await syncDailyRange({ daysBack, delayMs });

  const pendingTimelines = await countEventIdsWithoutTimeline();
  log.info(`Step 5/5: timelines (${pendingTimelines} matches queued, max ${timelineMax} calls)`);
  await backfillTimelines({
    batchSize: timelineBatch,
    maxCalls: timelineMax,
    delayMs,
  });

  const teamIds =
    parseTeamIds(process.env.BACKFILL_TEAM_IDS).length > 0
      ? parseTeamIds(process.env.BACKFILL_TEAM_IDS)
      : await listTeamIds({ limit: 100 });
  if (teamIds.length >= 2) {
    log.info(`Head-to-head pairs for ${teamIds.length} teams`);
    await backfillHeadToHead({ teamIds, delayMs });
  } else {
    log.info('Skip head-to-head (need BACKFILL_TEAM_IDS or teams in DB)');
  }

  const remaining = await countEventIdsWithoutTimeline();
  log.info('Backfill complete', { timelinesRemaining: remaining });
  if (remaining > 0) {
    log.info(
      `Re-run with higher BACKFILL_TIMELINE_MAX or run ingestion service — ${remaining} timelines still queued`,
    );
  }
}

main()
  .catch((err) => {
    log.error('Backfill failed', { error: err.message, stack: err.stack });
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownRedis();
    await shutdownDb();
  });
