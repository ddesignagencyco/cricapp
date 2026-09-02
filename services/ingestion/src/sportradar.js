const BASE_URL = process.env.SPORTRADAR_API_BASE_URL || 'https://api.sportradar.com';
const API_KEY = process.env.SPORTRADAR_API_KEY;
const ACCESS_LEVEL = 't';
const LANG = 'en';

const REQUEST_TIMEOUT_MS = Number(process.env.SPORTRADAR_TIMEOUT_MS || 15000);
const MAX_RETRIES = Number(process.env.SPORTRADAR_MAX_RETRIES || 3);

async function fetchJson(path, attempt = 0) {
  const url = `${BASE_URL}/cricket-${ACCESS_LEVEL}2/${LANG}/${path}`;
  const params = new URLSearchParams({ api_key: API_KEY });

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

  if (res.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter = Number(res.headers.get('retry-after') || 1) * 1000 || 1000;
    await new Promise((r) => setTimeout(r, retryAfter));
    return fetchJson(path, attempt + 1);
  }

  if (!res.ok) {
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
