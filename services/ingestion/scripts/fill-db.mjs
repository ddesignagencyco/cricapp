/**
 * One-shot database fill — Sportradar + PSL + news + live snapshot.
 *
 * Usage (from services/ingestion):
 *   npm run fill-db
 *
 * Requires: DATABASE_URL, REDIS_URL, SPORTRADAR_API_KEY (and optional NEWS_SOURCES).
 *
 * Env (all optional):
 *   FILL_DAYS=60                  — daily schedule + results window
 *   FILL_DELAY_MS=1100            — pause between Sportradar calls (~1 QPS trial)
 *   FILL_SEASON_LIMIT=10          — active tournament seasons to pull
 *   FILL_TEAM_LIMIT=80            — teams from DB when FILL_TEAM_IDS unset
 *   FILL_TEAM_IDS=sr:competitor:… — comma-separated override
 *   FILL_SUMMARY_MAX=300          — max match summary API calls
 *   FILL_TIMELINE_MAX=800         — max timeline API calls
 *   FILL_LINEUP_MAX=120
 *   FILL_PLAYER_PROFILE_MAX=200
 *   FILL_SKIP_NEWS=true           — skip RSS/news step
 *   FILL_SKIP_H2H=true            — skip head-to-head pairs
 *   PSL_SEASONS                   — same as ingestion service
 *
 * Re-run `npm run backfill:status` anytime for queue counts.
 * For ongoing live scores, still run `npm start` (ingestion service) after this.
 */
import db, { shutdown as shutdownDb } from '../src/db.js';
import redis, { shutdown as shutdownRedis } from '../src/redis.js';
import { createLogger } from '../src/logger.js';
import { pollOnce } from '../src/poll.js';
import { syncPsAll } from '../src/pslSync.js';
import { PSL_SEASONS } from '../src/schemas.js';
import { syncAllNewsSources } from '../src/newsSync.js';
import { syncStreamsOnce } from '../src/streamsSync.js';
import { getCallStats } from '../src/sportradar.js';
import {
  syncTourCatalog,
  syncTournamentResults,
  syncTournamentSeasonsFor,
  syncDailyRange,
  backfillTimelines,
  backfillMatchSummaries,
  backfillLineups,
  backfillPlayerProfiles,
  backfillTeamsFromSportradar,
  backfillHeadToHead,
} from '../src/refSync.js';
import {
  materializeTeamEvents,
  listTeamIds,
  listActiveSeasonIds,
  listActiveTournamentIds,
  countEventIdsWithoutTimeline,
  backfillTeamFieldsFromProfiles,
  backfillTeamFieldsFromLineups,
  backfillTeamManagersFromPlayers,
  backfillPlayerFieldsFromLineups,
  backfillPlayerFieldsFromProfiles,
} from '../src/store.js';

const log = createLogger('fill-db');

const delayMs = Number(process.env.FILL_DELAY_MS || process.env.BACKFILL_DELAY_MS || 1100);
const daysBack = Number(process.env.FILL_DAYS || process.env.BACKFILL_DAYS || 60);
const seasonLimit = Number(process.env.FILL_SEASON_LIMIT || process.env.BACKFILL_SEASON_LIMIT || 10);
const teamLimit = Number(process.env.FILL_TEAM_LIMIT || 80);
const summaryMax = Number(process.env.FILL_SUMMARY_MAX || 300);
const timelineMax = Number(process.env.FILL_TIMELINE_MAX || 800);
const timelineBatch = Number(process.env.FILL_TIMELINE_BATCH || 40);
const lineupMax = Number(process.env.FILL_LINEUP_MAX || 120);
const playerMax = Number(process.env.FILL_PLAYER_PROFILE_MAX || 200);
const skipNews = process.env.FILL_SKIP_NEWS === 'true';
const skipH2h = process.env.FILL_SKIP_H2H === 'true';

function parseTeamIds(raw) {
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function resolveTeamIds() {
  const fromEnv = parseTeamIds(process.env.FILL_TEAM_IDS || process.env.BACKFILL_TEAM_IDS);
  if (fromEnv.length) return fromEnv;
  return listTeamIds({ limit: teamLimit });
}

async function syncActiveSeasonCatalog() {
  const seasonIds = await listActiveSeasonIds({ limit: seasonLimit });
  for (const id of seasonIds) {
    try {
      await syncTournamentResults(id);
    } catch (err) {
      log.warn(`season results ${id}: ${err.message}`);
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  const tournamentIds = await listActiveTournamentIds({ limit: seasonLimit });
  for (const id of tournamentIds) {
    try {
      await syncTournamentSeasonsFor(id);
    } catch (err) {
      log.warn(`tournament seasons ${id}: ${err.message}`);
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { seasonIds: seasonIds.length, tournamentIds: tournamentIds.length };
}

async function runPostgresBackfills() {
  const teamFromProfiles = await backfillTeamFieldsFromProfiles();
  const teamFromLineups = await backfillTeamFieldsFromLineups({ limit: 200 });
  const managers = await backfillTeamManagersFromPlayers();
  const playersFromLineups = await backfillPlayerFieldsFromLineups({ limit: 200 });
  const playersFromProfiles = await backfillPlayerFieldsFromProfiles();
  return {
    teamFromProfiles,
    teamFromLineups,
    managers,
    playersFromLineups,
    playersFromProfiles,
  };
}

async function main() {
  await db.query('SELECT 1');
  await redis.ping();
  log.info('Full DB fill starting', {
    daysBack,
    delayMs,
    summaryMax,
    timelineMax,
    teamLimit,
  });

  log.info('Step 1/14: PSL standings, fixtures, leaders, squads');
  await syncPsAll(process.env.PSL_SEASONS);

  log.info('Step 2/14: tours + tournaments catalog');
  await syncTourCatalog({ force: true });

  log.info(`Step 3/14: daily schedule + results (${daysBack} days)`);
  await syncDailyRange({ daysBack, delayMs });

  log.info('Step 4/14: PSL tournament results per configured season');
  for (const season of PSL_SEASONS) {
    try {
      await syncTournamentResults(season.id);
    } catch (err) {
      log.warn(`PSL season results ${season.id}: ${err.message}`);
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  log.info('Step 5/14: active tournament seasons + results');
  await syncActiveSeasonCatalog();

  log.info('Step 6/14: materialize team schedule/results from sport_event_records');
  await materializeTeamEvents();

  const teamIds = await resolveTeamIds();
  log.info(`Step 7/14: team profiles + schedule + results (${teamIds.length} teams)`);
  await backfillTeamsFromSportradar({ teamIds, delayMs, schedule: true, results: true });

  log.info(`Step 8/14: match summaries (max ${summaryMax} calls)`);
  await backfillMatchSummaries({
    batchSize: 40,
    maxCalls: summaryMax,
    delayMs,
  });

  const pendingBeforeTimelines = await countEventIdsWithoutTimeline();
  log.info(
    `Step 9/14: timelines (${pendingBeforeTimelines} queued, max ${timelineMax} calls)`,
  );
  await backfillTimelines({
    batchSize: timelineBatch,
    maxCalls: timelineMax,
    delayMs,
  });

  log.info(`Step 10/14: match lineups (max ${lineupMax} calls)`);
  await backfillLineups({ batchSize: 20, maxCalls: lineupMax, delayMs });

  log.info(`Step 11/14: player profiles (max ${playerMax} calls)`);
  await backfillPlayerProfiles({ batchSize: 25, maxCalls: playerMax, delayMs });

  if (!skipH2h && teamIds.length >= 2) {
    log.info(`Step 12/14: head-to-head for ${teamIds.length} teams`);
    await backfillHeadToHead({ teamIds, delayMs });
  } else {
    log.info('Step 12/14: skip head-to-head (FILL_SKIP_H2H or fewer than 2 teams)');
  }

  log.info('Step 13/14: merge profile/lineup fields into teams + players');
  const merged = await runPostgresBackfills();
  log.info('Postgres field backfill', merged);

  if (skipNews) {
    log.info('Step 14/14: skip news (FILL_SKIP_NEWS=true)');
  } else {
    log.info('Step 14/14: news feeds');
    await syncAllNewsSources();
  }

  await syncStreamsOnce();
  const liveCount = await pollOnce();

  const pendingTimelines = await countEventIdsWithoutTimeline();
  const stats = getCallStats();
  log.info('Full DB fill complete', {
    sportradarCalls: stats.calls,
    sportradarRetries: stats.retries,
    liveMatchesPolled: liveCount,
    timelinesStillQueued: pendingTimelines,
  });

  if (pendingTimelines > 0) {
    log.info(
      `${pendingTimelines} timelines still queued — re-run fill-db with higher FILL_TIMELINE_MAX or run npm start`,
    );
  }
  log.info('Keep ingestion running for live updates: npm start');
}

main()
  .catch((err) => {
    log.error('Fill failed', { error: err.message, stack: err.stack });
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownRedis();
    await shutdownDb();
  });
