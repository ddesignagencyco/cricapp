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
