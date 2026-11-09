import { createLogger } from './logger.js';

const log = createLogger('profiles');

/**
 * On-demand player profiles. The API adds a player id to the `profile:wanted` sorted set when
 * someone opens a player page that has no full profile yet; this worker drains it a few at a
 * time. A day's worth of requests is capped (each profile costs up to four provider requests),
 * and every popped player gets a `profile:backoff:<id>` marker so one that failed is not retried
 * on every page view.
 */

const QUEUE = 'profile:wanted';
const BACKOFF_S = 6 * 3600;

const day = () => new Date().toISOString().slice(0, 10);

export async function drainProfileQueue({ perTick = 2, dailyCap = Number(process.env.REF_ONDEMAND_PROFILE_DAILY || 30), sync, client } = {}) {
  // Loaded on first use so importing this module (and its tests) opens no connections.
  client ??= (await import('./redis.js')).default;
  sync ??= (await import('./refSync.js')).syncPlayerProfile;
  const used = Number(await client.get(`profile:ondemand:${day()}`)) || 0;
  const room = Math.min(perTick, dailyCap - used);
  if (room <= 0) return { synced: 0, failed: 0, capped: true };

  let synced = 0;
  let failed = 0;
  for (let i = 0; i < room; i += 1) {
    const popped = await client.zpopmin(QUEUE);
    const id = popped?.[0];
    if (!id) break;
    await client.set(`profile:backoff:${id}`, '1', 'EX', BACKOFF_S);
    await client.incr(`profile:ondemand:${day()}`);
    await client.expire(`profile:ondemand:${day()}`, 2 * 86400);
    try {
      await sync(id);
      synced += 1;
    } catch (err) {
      failed += 1;
      log.warn('on-demand profile failed', { id, error: err.message });
    }
  }
  return { synced, failed, capped: false };
}

export function startProfileQueue({ intervalMs = Number(process.env.PROFILE_QUEUE_INTERVAL_MS || 15000) } = {}) {
  if (!(intervalMs > 0)) return null;
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const r = await drainProfileQueue();
      if (r.synced || r.failed) log.info('on-demand profiles', r);
    } catch (err) {
      log.warn('profile queue tick failed', { error: err.message });
    } finally {
      busy = false;
    }
  }, intervalMs);
  timer.unref?.();
  return timer;
}
