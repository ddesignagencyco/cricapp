import { PROVIDERS } from './schemas.js';
import db, { shutdown as shutdownDb } from './db.js';
import redis, { shutdown as shutdownRedis } from './redis.js';
import { pollOnce } from './poll.js';
import { syncPsAll } from './pslSync.js';

export { computeRunRate, normalizeMatch, normalizeLineups } from './normalize.js';
export { diffMatch } from './diff.js';
export { saveMatch, saveTeamsPlayers, publishMatchState, publishEvents } from './store.js';
export { pollOnce } from './poll.js';
export { syncPsAll } from './pslSync.js';

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 30000);

async function ping() {
  await db.query('SELECT 1');
  console.log('postgres connected');

  await redis.ping();
  console.log('redis connected');
}

async function syncPsOnStart() {
  const seasonFilter = process.env.PSL_SEASONS;
  const syncInterval = process.env.PSL_SYNC_INTERVAL_MS;
  await syncPsAll(seasonFilter);
  if (syncInterval) {
    setInterval(() => {
      syncPsAll(seasonFilter).catch((err) =>
        console.error('[psl] periodic sync failed', err.message),
      );
    }, Number(syncInterval));
  }
}

async function pollLoop() {
  while (true) {
    try {
      const count = await pollOnce();
      if (count > 0) console.log(`[ingest] polled ${count} live match(es)`);
    } catch (err) {
      console.error('[ingest] poll cycle failed', err.message);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

async function shutdown() {
  console.log('shutting down...');
  await shutdownRedis();
  await shutdownDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`cricapp ingestion — provider=${PROVIDERS.SPORTRADAR}; interval=${POLL_INTERVAL_MS}ms`);

ping()
  .then(async () => {
    await syncPsOnStart();
    return pollLoop();
  })
  .catch((err) => {
    console.error('failed to start ingestion service', err);
    process.exit(1);
  });
