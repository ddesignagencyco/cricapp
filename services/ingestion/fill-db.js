import db, { shutdown as shutdownDb } from './src/db.js';
import redis, { shutdown as shutdownRedis } from './src/redis.js';
import { pollOnce } from './src/poll.js';
import { syncPsAll } from './src/pslSync.js';
import { refSyncAll, syncTourCatalog } from './src/refSync.js';
import { startNewsSync } from './src/newsSync.js';
import { createLogger } from './src/logger.js';

const log = createLogger('oneshot');

async function ping() {
  await db.query('SELECT 1');
  log.info('postgres connected');
  await redis.ping();
  log.info('redis connected');
}

async function main() {
  await ping();

  log.info('=== Starting one-time DB fill ===');

  // 1. PSL sync (standings, fixtures, leaders, squads)
  log.info('1/5 PSL sync...');
  const pslResults = await syncPsAll(process.env.PSL_SEASONS);
  log.info('PSL sync done', { results: pslResults.length });

  // 2. Tours + tournaments (force — Redis staleness must not skip an empty Postgres)
  log.info('2/5 Tour catalog (tournaments + category tours)...');
  const catalog = await syncTourCatalog({ force: true });
  log.info('Tour catalog done', catalog);

  // 3. Reference sync (daily schedules, profiles, timelines, …)
  log.info('3/5 Reference sync...');
  await refSyncAll({
    delay: Number(process.env.BACKFILL_DELAY_MS || 1000),
    timelineLimit: Number(process.env.BACKFILL_TIMELINE_BATCH || 10),
    seasonLimit: Number(process.env.BACKFILL_SEASON_LIMIT || 5),
    teamLimit: Number(process.env.BACKFILL_TEAM_PROFILE_LIMIT || 5),
    lineupLimit: Number(process.env.BACKFILL_LINEUP_LIMIT || 10),
  });
  log.info('Reference sync done');

  // 4. News sync
  log.info('4/5 News sync...');
  await startNewsSync();
  log.info('News sync done');

  // 5. One poll cycle for live matches
  log.info('5/5 Live match poll...');
  const liveCount = await pollOnce();
  log.info('Poll cycle done', { liveMatches: liveCount });

  log.info('=== DB fill complete ===');

  await shutdownRedis();
  await shutdownDb();
  process.exit(0);
}

main().catch((err) => {
  log.error('Fatal error', { error: err.message, stack: err.stack });
  process.exit(1);
});
