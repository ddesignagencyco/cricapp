import { createLogger } from './logger.js';
import {
  fetchPrematchSportEvents,
  normalizeOcMatchWinnerRows,
  oddsFeedConfigured,
} from './sportradarOdds.js';
import {
  filterKnownMatchIds,
  getLatestPricesByMarket,
  insertOddsSnapshotsBatch,
  pruneSettledOddsSnapshots,
  upsertOddsMarket,
  upsertOddsSource,
} from './oddsStore.js';
import redis, { redisKeys } from './redis.js';
import { ODDS_LICENSE_STATUS, ODDS_MARKET_TYPE } from '@cricapp/shared-types';

const log = createLogger('oddsSync');

const DEFAULT_INTERVAL_MS = Number(process.env.ODDS_SYNC_INTERVAL_MS || 300000);
const SPORT_ID = process.env.SPORTRADAR_ODDS_CRICKET_SPORT_ID || '';
/** Only insert a snapshot when the price actually changed (unless forced). */
const FORCE_SNAPSHOTS = process.env.ODDS_FORCE_SNAPSHOTS === 'true';
/** Publish a Redis alert when a price moves at least this many percent. 0 disables. */
const MOVEMENT_ALERT_PERCENT = Number(process.env.ODDS_MOVEMENT_ALERT_PERCENT || 10);
const RETENTION_DAYS = Number(process.env.ODDS_RETENTION_DAYS || 90);
const PRUNE_INTERVAL_MS = Number(process.env.ODDS_PRUNE_INTERVAL_MS || 24 * 60 * 60 * 1000);

/**
 * Poll Sportradar Odds Comparison when licensed. Cricket stats API is unrelated.
 *
 * Pipeline: fetch → normalize → validate match ids against `matches` →
 * upsert sources/markets (cached per cycle) → dedupe unchanged prices →
 * batch insert → movement alerts + API cache invalidation.
 */
export async function syncOddsOnce() {
  if (!oddsFeedConfigured()) {
    log.info('odds sync skipped (SPORTRADAR_ODDS_ENABLED != true or missing key)');
    return { ingested: 0, skippedUnchanged: 0, alerts: 0, unmatched: 0 };
  }
  if (!SPORT_ID) {
    log.warn('odds sync skipped — set SPORTRADAR_ODDS_CRICKET_SPORT_ID from your OC contract');
    return { ingested: 0, skippedUnchanged: 0, alerts: 0, unmatched: 0 };
  }

  const payload = await fetchPrematchSportEvents(SPORT_ID);
  const rows = normalizeOcMatchWinnerRows(payload);
  if (rows.length === 0) {
    log.info('odds sync complete — no normalized rows in payload');
    return { ingested: 0, skippedUnchanged: 0, alerts: 0, unmatched: 0 };
  }

  // Resolve OC event ids to stored `matches.match_id` (sr:sport_event:* vs sr:match:*).
  const candidates = [...new Set(rows.flatMap((r) => r.matchIdCandidates))];
  const known = await filterKnownMatchIds(candidates);
  const resolveMatchId = (row) => row.matchIdCandidates.find((id) => known.has(id)) ?? null;

  const sourceIdBySlug = new Map();
  const marketIdByKey = new Map();
  const pendingByMarket = new Map(); // marketId -> rows[]
  let unmatched = 0;

  for (const row of rows) {
    const matchId = resolveMatchId(row);
    if (!matchId) {
      unmatched += 1;
      continue;
    }

    const sourceSlug = `sr-oc-${row.bookmakerSlug}`;
    let sourceId = sourceIdBySlug.get(sourceSlug);
    if (!sourceId) {
      sourceId = await upsertOddsSource({
        slug: sourceSlug,
        name: `Sportradar OC — ${row.bookmakerName}`,
        providerType: 'aggregator',
        licenseStatus: ODDS_LICENSE_STATUS.LICENSED,
        isActive: true,
        externalId: row.bookmakerSlug,
      });
      sourceIdBySlug.set(sourceSlug, sourceId);
    }

    const marketCacheKey = `${matchId}:${sourceId}:${row.marketType}`;
    let marketId = marketIdByKey.get(marketCacheKey);
    if (!marketId) {
      marketId = await upsertOddsMarket({
        matchId,
        sourceId,
        marketType: row.marketType,
        marketKey: ODDS_MARKET_TYPE.MATCH_WINNER,
        name: row.marketName || 'Match winner (incl. super over)',
      });
      marketIdByKey.set(marketCacheKey, marketId);
    }

    const list = pendingByMarket.get(marketId) ?? [];
    list.push({ ...row, matchId, marketId, sourceSlug });
    pendingByMarket.set(marketId, list);
  }

  if (unmatched > 0) {
    log.warn('odds rows skipped — event id not present in matches table', { unmatched });
  }
  if (pendingByMarket.size === 0) {
    return { ingested: 0, skippedUnchanged: 0, alerts: 0, unmatched };
  }

  // Dedupe: skip snapshots whose price is unchanged vs the latest stored row.
  const latestPrices = await getLatestPricesByMarket([...pendingByMarket.keys()]);
  const toInsert = [];
  let skippedUnchanged = 0;
  const movements = [];

  for (const [marketId, list] of pendingByMarket) {
    for (const row of list) {
      const previous = latestPrices.get(`${marketId}:${row.selectionKey}`);
      if (previous !== undefined && previous === row.decimalPrice && !FORCE_SNAPSHOTS) {
        skippedUnchanged += 1;
        continue;
      }
      toInsert.push({
        marketId,
        matchId: row.matchId,
        selectionKey: row.selectionKey,
        decimalPrice: row.decimalPrice,
        capturedAt: row.capturedAt,
        raw: row.raw,
      });
      if (previous !== undefined && MOVEMENT_ALERT_PERCENT > 0) {
        const movementPercent = ((row.decimalPrice - previous) / previous) * 100;
        if (Math.abs(movementPercent) >= MOVEMENT_ALERT_PERCENT) {
          movements.push({
            matchId: row.matchId,
            marketKey: ODDS_MARKET_TYPE.MATCH_WINNER,
            sourceSlug: row.sourceSlug,
            selectionKey: row.selectionKey,
            previous,
            current: row.decimalPrice,
            movementPercent: Number(movementPercent.toFixed(2)),
            capturedAt: row.capturedAt,
          });
        }
      }
    }
  }

  const ingested = await insertOddsSnapshotsBatch(toInsert);

  // Invalidate API caches for matches whose prices changed.
  const touchedMatchIds = new Set(toInsert.map((row) => row.matchId));
  for (const matchId of touchedMatchIds) {
    await redis.del(redisKeys.oddsMatch(matchId)).catch(() => {});
  }

  for (const movement of movements) {
    await redis
      .publish(redisKeys.oddsMovementChannel(), JSON.stringify(movement))
      .catch((err) => log.error('odds movement publish failed', { error: err.message }));
    log.info('significant odds movement', movement);
  }

  log.info('odds sync complete', { ingested, skippedUnchanged, alerts: movements.length, unmatched });
  return { ingested, skippedUnchanged, alerts: movements.length, unmatched };
}

export async function pruneOddsOnce() {
  if (RETENTION_DAYS <= 0) return 0;
  const deleted = await pruneSettledOddsSnapshots(RETENTION_DAYS);
  if (deleted > 0) {
    log.info('pruned settled odds snapshots', { deleted, retentionDays: RETENTION_DAYS });
  }
  return deleted;
}

export function startOddsSync() {
  if (!oddsFeedConfigured()) {
    log.info('periodic odds sync not started');
    return;
  }
  const run = () => {
    syncOddsOnce().catch((err) => log.error('odds sync failed', { error: err.message }));
  };
  run();
  if (DEFAULT_INTERVAL_MS > 0) {
    setInterval(run, DEFAULT_INTERVAL_MS);
    log.info('odds periodic sync scheduled', { intervalMs: DEFAULT_INTERVAL_MS });
  }
  if (PRUNE_INTERVAL_MS > 0 && RETENTION_DAYS > 0) {
    setInterval(() => {
      pruneOddsOnce().catch((err) => log.error('odds prune failed', { error: err.message }));
    }, PRUNE_INTERVAL_MS);
    log.info('odds retention prune scheduled', {
      intervalMs: PRUNE_INTERVAL_MS,
      retentionDays: RETENTION_DAYS,
    });
  }
}
