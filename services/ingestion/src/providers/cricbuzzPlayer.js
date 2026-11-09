import { rapidGet } from './rapidHttp.js';
import { ProviderUnsupportedError } from './errors.js';

/**
 * Player profiles from two Cricbuzz hosts (same RapidAPI key, separate free plans):
 *  - cricbuzz-real-time-cricket-api (cricbuzz3): `player/get-info` (bio, birth, teams, rankings,
 *    recent form) and `player/get-career` (debut / last match per format);
 *  - cricbuzz-cricket2: `stats/v1/player/{id}/batting|bowling` (career tables per format).
 *    The real-time host answers NOT_FOUND for those two, so the stats come from this one.
 *
 * Profiles change slowly, so each response is cached for a week. One profile costs up to four
 * requests; the stats and career calls are optional (a failure there still yields a profile).
 */

const PROFILE_TTL_S = 7 * 24 * 3600;
const IMG = (imageId) => (imageId ? `https://static.cricbuzz.com/a/img/v1/152x152/i1/c${imageId}/i.jpg` : null);

const host3 = () => process.env.RAPIDAPI_CRICBUZZ3_HOST || 'cricbuzz-real-time-cricket-api.p.rapidapi.com';
const host2 = () => process.env.RAPIDAPI_CRICBUZZ2_HOST || 'cricbuzz-cricket2.p.rapidapi.com';
const budget3 = () => ({ period: 'month', limit: Number(process.env.RAPIDAPI_CRICBUZZ3_MONTHLY_BUDGET || 250) });
const budget2 = () => ({ period: 'month', limit: Number(process.env.RAPIDAPI_CRICBUZZ2_MONTHLY_BUDGET || 100) });

export function rawPlayerId(id) {
  const m = String(id).match(/^cb:player:(\d+)$/) ?? String(id).match(/^(\d+)$/);
  if (!m) throw new ProviderUnsupportedError(`cricbuzz profiles need a cb:player id, got ${id}`);
  return m[1];
}

/** "Batting Allrounder" / "WK-Batter" / "Bowler" → the role names the rest of the app uses. */
export function roleType(role) {
  const s = String(role ?? '').toLowerCase();
  if (!s) return null;
  if (/wk|keeper/.test(s)) return 'wicketkeeper';
  if (/all.?round/.test(s)) return 'all_rounder';
  if (/bowl/.test(s)) return 'bowler';
  if (/bat/.test(s)) return 'batsman';
  return null;
}

export function isoDate(text) {
  const t = Date.parse(`${text ?? ''} UTC`);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

/** `{headers:[ROWHEADER,Test,...], values:[{values:[label, ...]}]}` → `{formats, rows}`. */
export function toStatTable(raw) {
  const headers = Array.isArray(raw?.headers) ? raw.headers : [];
  if (headers.length < 2 || !Array.isArray(raw?.values)) return null;
  const rows = raw.values
    .map((r) => r?.values)
    .filter((v) => Array.isArray(v) && v.length > 1)
    .map(([label, ...values]) => ({ label: String(label), values: values.map(String) }));
  return rows.length ? { formats: headers.slice(1).map(String), rows } : null;
}

/** A table whose every count is zero means "never bowled / never batted", not a data point. */
export function hasActivity(table) {
  const innings = table?.rows.find((r) => /^innings$/i.test(r.label));
  return Boolean(innings && innings.values.some((v) => Number(v) > 0));
}

export function toCareer(raw) {
  const out = {};
  for (const f of raw?.values ?? []) {
    if (!f?.name || /not played/i.test(f.debut ?? '')) continue;
    out[f.name] = {
      debut: f.debut ?? null,
      lastPlayed: f.lastPlayed ?? null,
      debutMatchId: f.debutMatchID ? `cb:match:${f.debutMatchID}` : null,
      lastMatchId: f.lastPlayedMatchId ? `cb:match:${f.lastPlayedMatchId}` : null,
    };
  }
  return out;
}

function recent(raw) {
  if (!raw?.rows?.length) return null;
  return {
    headers: raw.headers ?? [],
    rows: raw.rows.map((r) => ({
      matchId: r.values?.[0] ? `cb:match:${r.values[0]}` : null,
      values: (r.values ?? []).slice(1).map(String),
    })),
  };
}

/** Pure mapping from the raw responses to the stored profile payload (SportsRadar-compatible `player` block). */
export function toProfile(id, info, career, batting, bowling) {
  const dob = isoDate(info.DoBFormat ?? String(info.DoB ?? '').replace(/\s*\(.*\)$/, ''));
  const battingTable = toStatTable(batting);
  const bowlingTable = toStatTable(bowling);
  return {
    player: {
      id: `cb:player:${id}`,
      name: info.name ?? null,
      full_name: info.fullName ?? info.name ?? null,
      date_of_birth: dob,
      nationality: info.intlTeam ?? null,
      batting_style: info.bat ?? null,
      bowling_style: info.bowl ?? null,
      type: roleType(info.role),
      avatar_url: IMG(info.faceImageId),
    },
    cricbuzz: {
      role: info.role ?? null,
      bio: info.bio ?? null,
      birthPlace: info.birthPlace ?? null,
      intlTeam: info.intlTeam ?? null,
      clubs: (info.teamNameIds ?? []).map((t) => ({ id: `cb:team:${t.teamId}`, name: t.teamName })),
      rankings: info.rankings ?? null,
      career: toCareer(career),
      batting: battingTable && hasActivity(battingTable) ? battingTable : null,
      bowling: bowlingTable && hasActivity(bowlingTable) ? bowlingTable : null,
      recentBatting: recent(info.recentBatting),
      recentBowling: recent(info.recentBowling),
      profileUrl: info.appIndex?.webURL ?? null,
      // false when the stats host was unavailable (daily quota, outage): the sync retries these later
      statsComplete: Boolean(batting && bowling),
      fetchedAt: new Date().toISOString(),
    },
  };
}

/** Optional call: a missing or failed secondary response must not lose the profile. */
async function optional(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[cricbuzz profile] ${label} unavailable: ${err.message}`);
    return null;
  }
}

export async function fetchPlayerProfile(playerId) {
  const id = rawPlayerId(playerId);
  const real = (path) =>
    rapidGet({ provider: 'cricbuzz3', cacheNamespace: 'cricbuzz3', host: host3(), path, query: { playerId: id }, ttlSeconds: PROFILE_TTL_S, budget: budget3() });
  const stats = (kind) =>
    rapidGet({ provider: 'cricbuzz2', cacheNamespace: 'cricbuzz2', host: host2(), path: `stats/v1/player/${id}/${kind}`, ttlSeconds: PROFILE_TTL_S, budget: budget2() });

  const info = await real('player/get-info');
  if (!info?.id) throw new Error(`cricbuzz has no profile for player ${id}`);
  const career = await optional('career', () => real('player/get-career'));
  const batting = await optional('batting stats', () => stats('batting'));
  const bowling = await optional('bowling stats', () => stats('bowling'));
  return toProfile(id, info, career, batting, bowling);
}
