import { createLogger } from './logger.js';
import {
  fetchPrematchSportEvents,
  normalizeOcMatchWinnerRows,
  oddsFeedConfigured,
} from './sportradarOdds.js';
import { insertOddsSnapshot, upsertOddsMarket, upsertOddsSource } from './oddsStore.js';
import { ODDS_LICENSE_STATUS, ODDS_SELECTION } from '@cricapp/shared-types';

const log = createLogger('oddsSync');

const DEFAULT_INTERVAL_MS = Number(process.env.ODDS_SYNC_INTERVAL_MS || 300000);
const SPORT_ID = process.env.SPORTRADAR_ODDS_CRICKET_SPORT_ID || '';

/**
 * Poll Sportradar Odds Comparison when licensed. Cricket stats API is unrelated.
 */
export async function syncOddsOnce() {
  if (!oddsFeedConfigured()) {
    log.info('odds sync skipped (SPORTRADAR_ODDS_ENABLED != true or missing key)');
    return { ingested: 0 };
  }
  if (!SPORT_ID) {
    log.warn('odds sync skipped — set SPORTRADAR_ODDS_CRICKET_SPORT_ID from your OC contract');
    return { ingested: 0 };
  }

  const payload = await fetchPrematchSportEvents(SPORT_ID);
  const rows = normalizeOcMatchWinnerRows(payload);
  let ingested = 0;

  for (const row of rows) {
    const sourceId = await upsertOddsSource({
      slug: `sr-oc-${row.bookmaker}`,
      name: `Sportradar OC — ${row.bookmaker}`,
      providerType: 'aggregator',
      licenseStatus: ODDS_LICENSE_STATUS.LICENSED,
      isActive: true,
      externalId: row.bookmaker,
    });
    const marketId = await upsertOddsMarket({
      matchId: row.matchId,
      sourceId,
    });
    await insertOddsSnapshot({
      marketId,
      selectionKey: ODDS_SELECTION.HOME,
      decimalPrice: row.homeDecimal,
      capturedAt: row.capturedAt,
      raw: row,
    });
    await insertOddsSnapshot({
      marketId,
      selectionKey: ODDS_SELECTION.AWAY,
      decimalPrice: row.awayDecimal,
      capturedAt: row.capturedAt,
      raw: row,
    });
    ingested += 1;
  }

  log.info('odds sync complete', { ingested });
  return { ingested };
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
}
