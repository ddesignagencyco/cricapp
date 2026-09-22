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
 * Map OC payload rows into normalized match-winner snapshots.
 * Exact shape depends on the licensed OC feed — extend when sample payloads are available.
 * @param {unknown} payload
 * @returns {Array<{ matchId: string, capturedAt: Date, homeDecimal: number, awayDecimal: number, bookmaker: string }>}
 */
export function normalizeOcMatchWinnerRows(payload) {
  if (!payload || typeof payload !== 'object') return [];
  const record = /** @type {Record<string, unknown>} */ (payload);
  const events = record.sport_events ?? record.sportEvents ?? [];
  if (!Array.isArray(events)) return [];

  const rows = [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const e = /** @type {Record<string, unknown>} */ (event);
    const matchId = e.id ?? e.sport_event_id;
    if (typeof matchId !== 'string' || !matchId.startsWith('sr:')) continue;
    // Placeholder: real mapping requires OC market/outcome definitions from your contract.
    rows.push({
      matchId,
      capturedAt: new Date(),
      homeDecimal: 0,
      awayDecimal: 0,
      bookmaker: 'sportradar-oc',
    });
  }
  return rows.filter((r) => r.homeDecimal > 1 && r.awayDecimal > 1);
}
