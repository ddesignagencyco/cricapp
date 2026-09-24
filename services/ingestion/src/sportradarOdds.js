/**
 * Sportradar Odds Comparison (OC) API — separate product from the Cricket stats API.
 * Your existing SPORTRADAR_API_KEY + cricket-t2 paths do NOT include bookmaker prices.
 * Enable only when SPORTRADAR_ODDS_API_KEY and a licensed OC cricket package are active.
 */

const BASE_URL = process.env.SPORTRADAR_ODDS_API_BASE_URL || 'https://api.sportradar.com';
const API_KEY = process.env.SPORTRADAR_ODDS_API_KEY;
const ACCESS_LEVEL = process.env.SPORTRADAR_ODDS_ACCESS_LEVEL || 't';
const LANG = process.env.SPORTRADAR_ODDS_LANG || 'en';

const REQUEST_TIMEOUT_MS = Number(process.env.SPORTRADAR_ODDS_TIMEOUT_MS || 15000);

/** Market types/names accepted as the match-winner market (lowercase match). */
const MATCH_WINNER_MARKET_TYPES = new Set(
  (process.env.SPORTRADAR_ODDS_MARKET_TYPES || '1x2,match_odds,match_winner,moneyline,2way,2-way')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export function oddsFeedConfigured() {
  return Boolean(API_KEY && process.env.SPORTRADAR_ODDS_ENABLED === 'true');
}

/**
 * Fetch prematch sport events for a sport id (cricket sport id from OC docs when licensed).
 * @param {string} sportId
 */
export async function fetchPrematchSportEvents(sportId) {
  if (!API_KEY) throw new Error('SPORTRADAR_ODDS_API_KEY is not set');
  const path = `oddscomparison-${ACCESS_LEVEL}1/${LANG}/sports/${sportId}/sport_events/prematch.json`;
  const url = `${BASE_URL}/${path}?api_key=${encodeURIComponent(API_KEY)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Sportradar OC ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Candidate stored match ids for an OC sport-event id.
 * OC feeds use `sr:sport_event:<n>` while our `matches` rows historically use `sr:match:<n>`.
 * @param {string} eventId
 * @returns {string[]}
 */
export function matchIdCandidates(eventId) {
  const ids = new Set([eventId]);
  const m = /^sr:sport_event:(.+)$/.exec(eventId);
  if (m) ids.add(`sr:match:${m[1]}`);
  const m2 = /^sr:match:(.+)$/.exec(eventId);
  if (m2) ids.add(`sr:sport_event:${m2[1]}`);
  return [...ids];
}

/** Extract a decimal price from the several shapes OC outcomes may use. */
function extractDecimal(outcome) {
  if (!outcome || typeof outcome !== 'object') return null;
  const odds = outcome.odds;
  const candidates = [
    typeof odds === 'number' ? odds : null,
    odds && typeof odds === 'object' ? odds.decimal : null,
    odds && typeof odds === 'object' ? odds.decimal_odds : null,
    outcome.decimal,
    outcome.decimal_odds,
    outcome.price,
  ];
  for (const value of candidates) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 1) return num;
  }
  return null;
}

/**
 * Resolve an outcome to a selection key using numeric/name conventions and,
 * when available, the event's competitors (home/away qualifiers or ordering).
 * @param {string} outcomeName
 * @param {Array<{ name?: string, qualifier?: string }>} competitors
 * @returns {'home'|'away'|'draw'|null}
 */
export function selectionKeyForOutcome(outcomeName, competitors) {
  const raw = String(outcomeName ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (['1', 'home', 'yes'].includes(raw)) return 'home';
  if (['2', 'away', 'no'].includes(raw)) return 'away';
  if (['x', '3', 'draw', 'tie'].includes(raw)) return 'draw';

  const list = Array.isArray(competitors) ? competitors : [];
  const homeComp =
    list.find((c) => String(c?.qualifier ?? '').toLowerCase() === 'home') ?? list[0];
  const awayComp =
    list.find((c) => String(c?.qualifier ?? '').toLowerCase() === 'away') ?? list[1];
  const homeName = String(homeComp?.name ?? '').trim().toLowerCase();
  const awayName = String(awayComp?.name ?? '').trim().toLowerCase();
  if (homeName && raw === homeName) return 'home';
  if (awayName && raw === awayName) return 'away';
  return null;
}

function isMatchWinnerMarket(market) {
  if (!market || typeof market !== 'object') return false;
  const type = String(market.market_type ?? market.marketTypeId ?? market.type ?? '').toLowerCase();
  const name = String(market.name ?? '').toLowerCase();
  return MATCH_WINNER_MARKET_TYPES.has(type) || MATCH_WINNER_MARKET_TYPES.has(name);
}

/** Bookmakers may nest their priced markets one level deeper. */
function bookmakerOutcomeGroups(bookmaker) {
  const inner = bookmaker?.markets;
  if (Array.isArray(inner) && inner.length > 0) {
    return inner.flatMap((m) => (Array.isArray(m?.outcomes) ? m.outcomes : []));
  }
  return Array.isArray(bookmaker?.outcomes) ? bookmaker.outcomes : [];
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Map an OC prematch payload into normalized per-bookmaker price rows.
 * Handles the documented shape sport_events[].markets[].bookmakers[](.markets)[].outcomes[]
 * and tolerates outcome price variants (`odds.decimal`, `decimal`, `price`).
 * Rows with unresolved selections or prices <= 1 are dropped.
 *
 * @param {unknown} payload
 * @returns {Array<{
 *   matchIdCandidates: string[],
 *   marketType: string,
 *   marketName: string,
 *   bookmakerSlug: string,
 *   bookmakerName: string,
 *   selectionKey: 'home'|'away'|'draw',
 *   decimalPrice: number,
 *   capturedAt: Date,
 *   raw: object
 * }>}
 */
export function normalizeOcMatchWinnerRows(payload) {
  if (!payload || typeof payload !== 'object') return [];
  const record = /** @type {Record<string, unknown>} */ (payload);
  const events = record.sport_events ?? record.sportEvents ?? [];
  if (!Array.isArray(events)) return [];

  const capturedAt = new Date();
  const rows = [];

  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const e = /** @type {Record<string, unknown>} */ (event);
    const eventId = e.id ?? e.sport_event_id;
    if (typeof eventId !== 'string' || !eventId.startsWith('sr:')) continue;

    const competitors = Array.isArray(e.competitors) ? e.competitors : [];
    const markets = Array.isArray(e.markets) ? e.markets : [];

    for (const market of markets) {
      if (!isMatchWinnerMarket(market)) continue;
      const marketType = String(market.market_type ?? market.name ?? 'match_winner');
      const marketName = String(market.name ?? marketType);
      const bookmakers = Array.isArray(market.bookmakers) ? market.bookmakers : [];

      for (const bookmaker of bookmakers) {
        if (!bookmaker || typeof bookmaker !== 'object') continue;
        const bookmakerName = String(bookmaker.name ?? bookmaker.id ?? 'unknown');
        const bookmakerSlug = slugify(bookmakerName) || 'unknown';

        for (const outcome of bookmakerOutcomeGroups(bookmaker)) {
          const decimalPrice = extractDecimal(outcome);
          if (decimalPrice === null) continue;
          const selectionKey = selectionKeyForOutcome(outcome?.name, competitors);
          if (!selectionKey) continue;
          rows.push({
            matchIdCandidates: matchIdCandidates(eventId),
            marketType,
            marketName,
            bookmakerSlug,
            bookmakerName,
            selectionKey,
            decimalPrice,
            capturedAt,
            raw: { eventId, outcome: outcome?.name ?? null, decimalPrice },
          });
        }
      }
    }
  }

  return rows;
}
