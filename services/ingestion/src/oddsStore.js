import { randomUUID } from 'node:crypto';
import db from './db.js';
import { ODDS_LICENSE_STATUS, ODDS_MARKET_TYPE, ODDS_SELECTION } from '@cricapp/shared-types';

/**
 * Upsert a licensed odds source. Inactive or non-licensed sources are never shown publicly.
 */
export async function upsertOddsSource({
  slug,
  name,
  providerType = 'aggregator',
  licenseStatus = ODDS_LICENSE_STATUS.DISABLED,
  externalId = null,
  isActive = false,
  config = {},
}) {
  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO odds_sources (id, slug, name, provider_type, license_status, external_id, is_active, config, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       provider_type = EXCLUDED.provider_type,
       license_status = EXCLUDED.license_status,
       external_id = EXCLUDED.external_id,
       is_active = EXCLUDED.is_active,
       config = EXCLUDED.config,
       updated_at = NOW()
     RETURNING id`,
    [id, slug, name, providerType, licenseStatus, externalId, isActive, JSON.stringify(config)],
  );
  return result.rows[0].id;
}

export async function getOddsSourceBySlug(slug) {
  const result = await db.query(`SELECT id FROM odds_sources WHERE slug = $1`, [slug]);
  return result.rows[0]?.id ?? null;
}

export async function upsertOddsMarket({
  matchId,
  sourceId,
  marketType = ODDS_MARKET_TYPE.MATCH_WINNER,
  marketKey = ODDS_MARKET_TYPE.MATCH_WINNER,
  name = 'Match winner (incl. super over)',
  externalMarketId = null,
}) {
  const id = randomUUID();
  const result = await db.query(
    `INSERT INTO odds_markets (id, match_id, source_id, market_type, market_key, name, external_market_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (match_id, source_id, market_type) DO UPDATE SET
       market_key = EXCLUDED.market_key,
       name = EXCLUDED.name,
       external_market_id = EXCLUDED.external_market_id,
       updated_at = NOW()
     RETURNING id`,
    [id, matchId, sourceId, marketType, marketKey, name, externalMarketId],
  );
  return result.rows[0].id;
}

/** Append-only price snapshot (never update in place). */
export async function insertOddsSnapshot({
  marketId,
  selectionKey,
  decimalPrice,
  capturedAt,
  raw = null,
}) {
  const id = randomUUID();
  await db.query(
    `INSERT INTO odds_snapshots (id, market_id, selection_key, decimal_price, captured_at, received_at, raw)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6::jsonb)`,
    [id, marketId, selectionKey, decimalPrice, capturedAt, raw ? JSON.stringify(raw) : null],
  );
  return id;
}

/** Batch append-only snapshot insert (single round trip). */
export async function insertOddsSnapshotsBatch(rows) {
  if (!rows.length) return 0;
  const values = [];
  const params = [];
  rows.forEach((row, i) => {
    const base = i * 7;
    values.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, NOW(), $${base + 6}::jsonb)`,
    );
    params.push(
      row.id ?? randomUUID(),
      row.marketId,
      row.selectionKey,
      row.decimalPrice,
      row.capturedAt,
      row.raw ? JSON.stringify(row.raw) : null,
    );
  });
  await db.query(
    `INSERT INTO odds_snapshots (id, market_id, selection_key, decimal_price, captured_at, received_at, raw)
     VALUES ${values.join(', ')}`,
    params,
  );
  return rows.length;
}

/** Latest snapshot price per `marketId:selectionKey` (single query). */
export async function getLatestPricesByMarket(marketIds) {
  if (!marketIds.length) return new Map();
  const result = await db.query(
    `SELECT DISTINCT ON (market_id, selection_key) market_id, selection_key, decimal_price
     FROM odds_snapshots
     WHERE market_id = ANY($1::text[])
     ORDER BY market_id, selection_key, captured_at DESC`,
    [marketIds],
  );
  return new Map(
    result.rows.map((r) => [`${r.market_id}:${r.selection_key}`, Number(r.decimal_price)]),
  );
}

/** Which of the given ids exist in `matches` (single query). */
export async function filterKnownMatchIds(matchIds) {
  if (!matchIds.length) return new Set();
  const result = await db.query(
    `SELECT match_id FROM matches WHERE match_id = ANY($1::text[])`,
    [matchIds],
  );
  return new Set(result.rows.map((r) => r.match_id));
}

/**
 * Retention prune: delete snapshots older than `retentionDays` for matches that
 * are already finished (completed/cancelled). Append-only history for active
 * matches is never touched.
 * @returns {Promise<number>} rows deleted
 */
export async function pruneSettledOddsSnapshots(retentionDays = 90) {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await db.query(
    `DELETE FROM odds_snapshots s
     USING odds_markets m
     JOIN matches mt ON mt.match_id = m.match_id
     WHERE s.market_id = m.id
       AND mt.status IN ('completed', 'cancelled')
       AND s.captured_at < $1`,
    [cutoff],
  );
  return result.rowCount ?? 0;
}

export async function seedMatchWinnerSnapshots({
  matchId,
  sourceSlug,
  sourceName,
  homeDecimal,
  awayDecimal,
  capturedAt = new Date(),
}) {
  const sourceId = await upsertOddsSource({
    slug: sourceSlug,
    name: sourceName,
    licenseStatus: ODDS_LICENSE_STATUS.LICENSED,
    isActive: true,
  });
  const marketId = await upsertOddsMarket({ matchId, sourceId });
  await insertOddsSnapshot({
    marketId,
    selectionKey: ODDS_SELECTION.HOME,
    decimalPrice: homeDecimal,
    capturedAt,
  });
  await insertOddsSnapshot({
    marketId,
    selectionKey: ODDS_SELECTION.AWAY,
    decimalPrice: awayDecimal,
    capturedAt,
  });
  return { sourceId, marketId };
}
