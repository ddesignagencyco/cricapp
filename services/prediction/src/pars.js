import { detectFormat, parScoreForFormat } from './format.js';

const cache = {
  at: 0,
  byKey: new Map(),
};

const CACHE_MS = Number(process.env.PAR_CACHE_MS || 600000);
const MIN_VENUE_SAMPLES = Number(process.env.PAR_MIN_VENUE_SAMPLES || 5);

function parseFirstInningsRuns(row) {
  const innings = row.current_innings;
  if (innings && typeof innings === 'object') {
    const runs = Number(innings.runs);
    if (Number.isFinite(runs) && runs > 0) return runs;
  }
  const score = String(row.display_score ?? '');
  // Prefer the first total-looking number before a slash (e.g. "142/3").
  const match = score.match(/(\d{2,3})\s*\/\s*\d/);
  if (match) return Number(match[1]);
  const bare = score.match(/\b(\d{2,3})\b/);
  return bare ? Number(bare[1]) : null;
}

function venueKey(venue) {
  return String(venue ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function loadVenueFormatPars(query) {
  const now = Date.now();
  if (now - cache.at < CACHE_MS && cache.byKey.size) {
    return cache.byKey;
  }
  const r = await query(
    `SELECT venue, tournament, match_status, current_innings, display_score
     FROM matches
     WHERE status = 'completed'
       AND venue IS NOT NULL
       AND venue <> ''`,
  );
  const buckets = new Map();
  for (const row of r.rows) {
    const runs = parseFirstInningsRuns(row);
    if (!runs || runs < 40 || runs > 450) continue;
    const format = detectFormat(row.tournament, row.match_status);
    const key = `${venueKey(row.venue)}::${format}`;
    const bucket = buckets.get(key) ?? { sum: 0, n: 0, format, venue: row.venue };
    bucket.sum += runs;
    bucket.n += 1;
    buckets.set(key, bucket);
  }
  const byKey = new Map();
  for (const [key, bucket] of buckets) {
    byKey.set(key, {
      par: Math.round(bucket.sum / bucket.n),
      sampleSize: bucket.n,
      format: bucket.format,
      venue: bucket.venue,
      source: 'venue_history',
    });
  }
  cache.at = now;
  cache.byKey = byKey;
  return byKey;
}

export async function resolveParScore(query, { venue, format, tournament, matchStatus } = {}) {
  const resolvedFormat = format || detectFormat(tournament, matchStatus) || 't20';
  const fallback = {
    par: parScoreForFormat(resolvedFormat),
    sampleSize: 0,
    format: resolvedFormat,
    venue: venue ?? null,
    source: 'format_default',
  };
  if (!venue || !query) return fallback;
  try {
    const table = await loadVenueFormatPars(query);
    const hit = table.get(`${venueKey(venue)}::${resolvedFormat}`);
    if (hit && hit.sampleSize >= MIN_VENUE_SAMPLES) return hit;
    if (hit && hit.sampleSize >= 2) {
      // Blend sparse venue history with format default.
      const blended = Math.round(
        (hit.par * hit.sampleSize + fallback.par * MIN_VENUE_SAMPLES) /
          (hit.sampleSize + MIN_VENUE_SAMPLES),
      );
      return {
        ...hit,
        par: blended,
        source: 'venue_blended',
      };
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function clearParCache() {
  cache.at = 0;
  cache.byKey = new Map();
}
