import { PROVIDERS } from './schemas.js';
import db, { shutdown as shutdownDb } from './db.js';
import redis, { shutdown as shutdownRedis } from './redis.js';
import { pollOnce } from './poll.js';
import { syncPsAll } from './pslSync.js';
import { startReferenceSync } from './refSync.js';
import { startNewsSync } from './newsSync.js';
import { startStreamsSync } from './streamsSync.js';
import { createLogger } from './logger.js';

export { computeRunRate, normalizeMatch, normalizeLineups } from './normalize.js';
export { diffMatch } from './diff.js';
export { saveMatch, saveTeamsPlayers, publishMatchState, publishEvents } from './store.js';
export { pollOnce } from './poll.js';
export { syncPsAll } from './pslSync.js';

const log = createLogger('main');
const POLL_INTERVAL_LIVE_MS = Number(process.env.POLL_INTERVAL_LIVE_MS || 15000);
const POLL_INTERVAL_IDLE_MS = Number(process.env.POLL_INTERVAL_IDLE_MS || 60000);

async function ping() {
  await db.query('SELECT 1');
  log.info('postgres connected');

  await redis.ping();
  log.info('redis connected');
}

let pslSyncInFlight = false;

async function runPslSync(reason) {
  if (pslSyncInFlight) {
    log.info('psl sync already running — skip', { reason });
    return;
  }
  pslSyncInFlight = true;
  try {
    await syncPsAll(process.env.PSL_SEASONS);
  } finally {
    pslSyncInFlight = false;
  }
}

async function startPslSync() {
  await runPslSync('startup');
  const syncInterval = Number(process.env.PSL_SYNC_INTERVAL_MS || 0);
  if (syncInterval > 0) {
    setInterval(() => {
      runPslSync('interval').catch((err) =>
        log.error('psl periodic sync failed', { error: err.message }),
      );
    }, syncInterval);
  }
}

async function pollLoop() {
  let liveCount = 0;
  for (;;) {
    try {
      liveCount = await pollOnce();
    } catch (err) {
      log.error('poll cycle failed', { error: err.message });
      liveCount = 0;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_IDLE_MS));
    }
    const delay = liveCount > 0 ? POLL_INTERVAL_LIVE_MS : POLL_INTERVAL_IDLE_MS;
    await new Promise((r) => setTimeout(r, delay));
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
  pollIntervalMs: { live: POLL_INTERVAL_LIVE_MS, idle: POLL_INTERVAL_IDLE_MS },
});

const refSyncOptions = () => ({
  matchIds: (process.env.REF_SYNC_MATCH_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  teamIds: (process.env.REF_SYNC_TEAM_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  playerIds: (process.env.REF_SYNC_PLAYER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  tournamentIds: (process.env.REF_SYNC_TOURNAMENT_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  pairIds: (process.env.REF_SYNC_PAIR_IDS || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => p.split('::')),
  delay: Number(process.env.REF_SYNC_DELAY_MS || 500),
  timelineLimit: Number(process.env.REF_SYNC_MATCH_LIMIT || 20),
  seasonLimit: Number(process.env.REF_SYNC_SEASON_LIMIT || 10),
  teamLimit: Number(process.env.REF_SYNC_TEAMS_LIMIT || 10),
  lineupLimit: Number(process.env.REF_SYNC_LINEUP_LIMIT || 20),
});

const REF_SYNC_START_DELAY_MS = Number(process.env.REF_SYNC_START_DELAY_MS || 300000);
const PSL_START_DELAY_MS = Number(process.env.PSL_START_DELAY_MS || 120000);

ping()
  .then(async () => {
    // RSS/streams do not use the Sportradar quota.
    startNewsSync().catch((err) => log.error('news sync start failed', { error: err.message }));
    startStreamsSync();

    try {
      await pollOnce();
    } catch (err) {
      log.error('initial poll cycle failed', { error: err.message });
    }

    setTimeout(() => {
      startPslSync().catch((err) => log.error('psl sync start failed', { error: err.message }));
    }, PSL_START_DELAY_MS);

    setTimeout(() => {
      startReferenceSync(refSyncOptions()).catch((err) =>
        log.error('reference sync start failed', { error: err.message }),
      );
    }, REF_SYNC_START_DELAY_MS);

    return pollLoop();
  })
  .catch((err) => {
    log.error('failed to start ingestion service', { error: err.message, stack: err.stack });
    process.exit(1);
  });
