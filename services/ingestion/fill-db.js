import db, { shutdown as shutdownDb } from './src/db.js';
import redis, { shutdown as shutdownRedis } from './src/redis.js';
import { pollOnce } from './src/poll.js';
import { syncPsAll } from './src/pslSync.js';
import { refSyncAll } from './src/refSync.js';
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
  log.info('1/4 PSL sync...');
  const pslResults = await syncPsAll(process.env.PSL_SEASONS);
  log.info('PSL sync done', { results: pslResults.length });

  // 2. Reference sync (tours, tournaments, daily schedules, profiles, timelines)
  log.info('2/4 Reference sync...');
  await refSyncAll({
    delay: 1000,          // 1s delay between calls (safe for trial)
    timelineLimit: 10,    // limit initial timelines
    seasonLimit: 5,
    teamLimit: 5,
    lineupLimit: 10,
  });
  log.info('Reference sync done');

  // 3. News sync
  log.info('3/4 News sync...');
  await startNewsSync();
  log.info('News sync done');

  // 4. One poll cycle for live matches
  log.info('4/4 Live match poll...');
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
