const BASE_URL = process.env.SPORTRADAR_API_BASE_URL || 'https://api.sportradar.com';
const API_KEY = process.env.SPORTRADAR_API_KEY;
const ACCESS_LEVEL = 't';
const LANG = 'en';

const REQUEST_TIMEOUT_MS = Number(process.env.SPORTRADAR_TIMEOUT_MS || 15000);
const MAX_RETRIES = Number(process.env.SPORTRADAR_MAX_RETRIES || 3);

// Self-throttle to a token bucket at RATE_QPS so we stay under the provider
// quota and stop paying the 429 multiply-by-4 penalty. Trial tier is 1 QPS;
// raise SPORTRADAR_QPS for higher purchased tiers.
const RATE_QPS = Number(process.env.SPORTRADAR_QPS || 1);

let capacity = Math.max(RATE_QPS, 1);
let lastRefill = Date.now();

const stats = { calls: 0, retries: 0, throttledMs: 0, lastError: null };

export function getCallStats() {
  return { ...stats };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function acquireToken() {
  const started = Date.now();
  for (;;) {
    const now = Date.now();
    capacity = Math.min(
      Math.max(RATE_QPS, 1),
      capacity + ((now - lastRefill) / 1000) * RATE_QPS,
    );
    lastRefill = now;
    if (capacity >= 1) {
      capacity -= 1;
      stats.throttledMs += now - started;
      return;
    }
    await sleep(50);
  }
}

async function fetchJson(path, options = {}, attempt = 0) {
  const url = `${BASE_URL}/cricket-${ACCESS_LEVEL}2/${LANG}/${path}`;
  const params = new URLSearchParams({ api_key: API_KEY });
  if (options.since) params.set('since', options.since);

  await acquireToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${url}?${params.toString()}`, {
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`sportradar request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`);
    }
    throw new Error(`sportradar request failed: ${url} (${err.message})`);
  }
  clearTimeout(timer);

  stats.calls += 1;

  if (res.status === 429 && attempt < MAX_RETRIES) {
    stats.retries += 1;
    const retryAfterMs = (Number(res.headers.get('retry-after') || 0) || 1) * 1000;
    const backoffMs = retryAfterMs * 2 ** attempt;
    const jitter = 0.5 + Math.random() * 0.5;
    await sleep(Math.round(backoffMs * jitter));
    return fetchJson(path, options, attempt + 1);
  }

  if (!res.ok) {
    stats.lastError = `${res.status}: ${url}`;
    throw new Error(`sportradar request failed (${res.status}): ${url}`);
  }
  return res.json();
}

export async function fetchLiveSchedule() {
  const data = await fetchJson('schedules/live/schedule.json');
  return data.sport_events ?? [];
}

export async function fetchMatchSummary(matchId) {
  const data = await fetchJson(`matches/${matchId}/summary.json`);
  return data;
}

export async function fetchMatchLineups(matchId) {
  const data = await fetchJson(`matches/${matchId}/lineups.json`);
  return data;
}

export async function fetchTournamentSeasons(tournamentId) {
  const data = await fetchJson(`tournaments/${tournamentId}/seasons.json`);
  return data.seasons ?? [];
}

export async function fetchSeasonSchedule(seasonId) {
  const data = await fetchJson(`tournaments/${seasonId}/schedule.json`);
  return data.sport_events ?? [];
}

export async function fetchSeasonStandings(seasonId) {
  const data = await fetchJson(`tournaments/${seasonId}/standings.json`);
  return data.standings ?? [];
}

export async function fetchSeasonLeaders(seasonId) {
  const data = await fetchJson(`tournaments/${seasonId}/leaders.json`);
  return data;
}

export async function fetchTournamentInfo(tournamentId) {
  const data = await fetchJson(`tournaments/${tournamentId}/info.json`);
  return data;
}

export async function fetchSeasonSquad(seasonId, teamId) {
  const data = await fetchJson(`tournaments/${seasonId}/teams/${teamId}/squads.json`);
  return data;
}

export async function fetchDailySchedule(date) {
  const data = await fetchJson(`schedules/${date}/schedule.json`);
  return data;
}

export async function fetchDailyResults(date) {
  const data = await fetchJson(`schedules/${date}/results.json`);
  return data;
}

export async function fetchMatchTimeline(matchId) {
  const data = await fetchJson(`matches/${matchId}/timeline.json`);
  return data;
}

export async function fetchMatchTimelineDelta(matchId, since) {
  const data = await fetchJson(`matches/${matchId}/timeline/delta.json`, { since });
  return data;
}

export async function fetchPlayerProfile(playerId) {
  const data = await fetchJson(`players/${playerId}/profile.json`);
  return data;
}

export async function fetchTeamProfile(teamId) {
  const data = await fetchJson(`teams/${teamId}/profile.json`);
  return data;
}

export async function fetchTeamResults(teamId) {
  const data = await fetchJson(`teams/${teamId}/results.json`);
  return data;
}

export async function fetchTeamSchedule(teamId) {
  const data = await fetchJson(`teams/${teamId}/schedule.json`);
  return data;
}

export async function fetchTeamVersusTeam(teamId, teamId2) {
  const data = await fetchJson(`teams/${teamId}/versus/${teamId2}/matches.json`);
  return data;
}

export async function fetchTours() {
  const data = await fetchJson('tours.json');
  return data;
}

export async function fetchTournaments() {
  const data = await fetchJson('tournaments.json');
  return data;
}

export async function fetchTournamentResults(tournamentOrSeasonId) {
  const data = await fetchJson(`tournaments/${tournamentOrSeasonId}/results.json`);
  return data;
}
