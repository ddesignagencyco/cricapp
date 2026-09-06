/**
 * Redis-backed staleness tracking for reference-sync targets.
 *
 * Each target carries a key named `ref:sync:<category>[:<id>]` whose existence
 * means "fresh enough". Keys are written with a PX expiry equal to the
 * category cadence, so they self-expire and never accumulate unbounded match
 * ids. `shouldSync` is therefore a single EXISTS check and `markSynced`
 * stamps the key.
 */
import redis from './redis.js';

const PREFIX = 'ref:sync';

export const REF_CADENCE = Object.freeze({
  // Near-static lists: refresh rarely.
  tours: 7 * 24 * 3600e3,
  tournaments: 7 * 24 * 3600e3,
  tournamentSeasons: 7 * 24 * 3600e3,
  teamProfile: 7 * 24 * 3600e3,
  playerProfile: 7 * 24 * 3600e3,
  headToHead: 7 * 24 * 3600e3,
  // Slow-moving per-target data.
  teamSchedule: 24 * 3600e3,
  teamResults: 6 * 3600e3,
  seasonResults: 6 * 3600e3,
  daily: 6 * 3600e3,
  // One-shot syncs (retry if the key expired, otherwise skip forever).
  timeline: 365 * 24 * 3600e3,
  lineups: 30 * 24 * 3600e3,
});

function key(category, id) {
  return id ? `${PREFIX}:${category}:${id}` : `${PREFIX}:${category}`;
}

export async function shouldSync(category, id) {
  const exists = await redis.exists(key(category, id));
  return exists === 0;
}

export async function markSynced(category, id, cadenceMs) {
  await redis.set(key(category, id), Date.now(), 'PX', cadenceMs);
}