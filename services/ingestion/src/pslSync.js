import { PSL, PSL_SEASONS } from "./schemas.js";
import {
  fetchSeasonSchedule,
  fetchSeasonStandings,
  fetchSeasonLeaders,
  fetchTournamentInfo,
  fetchSeasonSquad,
} from "./sportradar.js";
import {
  normalizeSchedule,
  normalizeStandings,
  normalizeLeaders,
  normalizeSquad,
} from "./psl.js";
import {
  saveFixtures,
  saveStandings,
  saveLeaders,
  saveSquad,
  cachePsData,
  clearSeasonData,
} from "./store.js";

const SEASON_ID_BY_YEAR = Object.fromEntries(
  PSL_SEASONS.map((s) => [s.year, s.id]),
);

const ALL_SEASON_IDS = PSL_SEASONS.map((s) => s.id);

function parseFilter(raw) {
  if (!raw) return { ids: [...ALL_SEASON_IDS] };
  const tokens = String(raw)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.length) return { ids: [...ALL_SEASON_IDS] };
  const seasons = tokens.map((t) => SEASON_ID_BY_YEAR[t] ?? t);
  return { ids: seasons };
}

async function syncStandings(seasonId) {
  const raw = await fetchSeasonStandings(seasonId);
  const rows = normalizeStandings(raw);
  const count = await saveStandings(seasonId, rows);
  if (count) await cachePsData(seasonId, "standings", rows);
  return count;
}

async function syncFixtures(seasonId) {
  const raw = await fetchSeasonSchedule(seasonId);
  const rows = normalizeSchedule(raw);
  const count = await saveFixtures(seasonId, rows);
  if (count) await cachePsData(seasonId, "fixtures", rows);
  return count;
}

async function syncLeaders(seasonId) {
  const raw = await fetchSeasonLeaders(seasonId);
  const groups = normalizeLeaders(raw);
  await clearSeasonData(seasonId);
  const count = await saveLeaders(seasonId, groups);
  if (count) await cachePsData(seasonId, "leaders", groups);
  return count;
}

async function syncSquads(seasonId, seasonInfo) {
  const teams = seasonInfo?.groups?.flatMap((g) => g.teams ?? []) ?? [];
  let playerCount = 0;
  const squads = [];
  for (const team of teams) {
    if (!team.id) continue;
    try {
      const raw = await fetchSeasonSquad(seasonId, team.id);
      const squad = normalizeSquad(raw);
      const res = await saveSquad(seasonId, squad);
      squads.push(squad);
      playerCount += res.players;
    } catch (err) {
      console.error(`[psl] squad fetch failed for ${team.id}`, err.message);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (squads.length) await cachePsData(seasonId, "squads", squads);
  return { teams: teams.length, players: playerCount };
}

async function syncOneSeason(season, tournamentInfo) {
  await syncStandings(season.id);
  console.log(`[psl] ${season.year}: standings persisted`);
  await syncFixtures(season.id);
  console.log(`[psl] ${season.year}: fixtures persisted`);
  await syncLeaders(season.id);
  console.log(`[psl] ${season.year}: leaders persisted`);
  return syncSquads(season.id, tournamentInfo);
}

export async function syncPsAll(rawSeasonFilter) {
  const { ids } = parseFilter(rawSeasonFilter);
  const targets = PSL_SEASONS.filter((s) => ids.includes(s.id));
  const results = [];

  let tournamentInfo = null;
  try {
    tournamentInfo = await fetchTournamentInfo(PSL.TOURNAMENT_ID);
  } catch (err) {
    console.error(`[psl] tournament info fetch failed`, err.message);
  }

  for (const season of targets) {
    try {
      const squad = await syncOneSeason(season, tournamentInfo);
      results.push({ seasonId: season.id, year: season.year, ...squad });
      console.log(
        `[psl] synced ${season.year}: squads=${squad.teams} teams / ${squad.players} players`,
      );
    } catch (err) {
      console.error(`[psl] sync failed for ${season.name}`, err.message);
    }
  }
  return results;
}
