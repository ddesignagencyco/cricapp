import { PROVIDERS } from './schemas.js';
import db, { shutdown as shutdownDb } from './db.js';
import redis, { shutdown as shutdownRedis } from './redis.js';
import { pollOnce } from './poll.js';
import { syncPsAll } from './pslSync.js';
import { createLogger } from './logger.js';

export { computeRunRate, normalizeMatch, normalizeLineups } from './normalize.js';
export { diffMatch } from './diff.js';
export { saveMatch, saveTeamsPlayers, publishMatchState, publishEvents } from './store.js';
export { pollOnce } from './poll.js';
export { syncPsAll } from './pslSync.js';

const log = createLogger('main');
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 30000);

async function ping() {
  await db.query('SELECT 1');
  log.info('postgres connected');

  await redis.ping();
  log.info('redis connected');
}

async function syncPsOnStart() {
  const seasonFilter = process.env.PSL_SEASONS;
  const syncInterval = process.env.PSL_SYNC_INTERVAL_MS;
  await syncPsAll(seasonFilter);
  if (syncInterval) {
    setInterval(() => {
      syncPsAll(seasonFilter).catch((err) =>
        log.error('psl periodic sync failed', { error: err.message }),
      );
    }, Number(syncInterval));
  }
}

async function pollLoop() {
  while (true) {
    try {
      const count = await pollOnce();
      if (count > 0) log.info('polled live matches', { count });
    } catch (err) {
      log.error('poll cycle failed', { error: err.message });
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

async function shutdown() {
  log.info('shutting down...');
  await shutdownRedis();
  await shutdownDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

log.info('starting ingestion service', {
  provider: PROVIDERS.SPORTRADAR,
  pollIntervalMs: POLL_INTERVAL_MS,
});

ping()
  .then(async () => {
    await syncPsOnStart();
    return pollLoop();
  })
  .catch((err) => {
    log.error('failed to start ingestion service', { error: err.message, stack: err.stack });
    process.exit(1);
  });
