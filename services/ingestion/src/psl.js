import { PSL_LEADER_CATEGORIES } from "./schemas.js";

function pickRanked(payload, sortKey) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((p) => p && p.player)
    .map((p, i) => ({
      rank: p.rank || i + 1,
      playerId: p.player.id ?? null,
      playerName: p.player.full_name ?? p.player.name ?? "Unknown",
      teamAbbr: p.team?.abbreviation ?? null,
      teamName: p.team?.name ?? null,
      value:
        typeof p.total === "number"
          ? p.total
          : typeof p.rate === "number"
            ? p.rate
            : typeof p.average === "number"
              ? p.average
              : (p[sortKey] ?? 0),
    }))
    .sort((a, b) => a.rank - b.rank);
}

/**
 * Normalize a Sportradar leaders payload into canonical { category, stat, entries[] }.
 */
export function normalizeLeaders(raw) {
  const leaders = [];

  const pushList = (category, stat, payload, sortKey) => {
    const entries = pickRanked(payload, sortKey);
    leaders.push({ category, stat, entries });
  };

  const batting = raw?.batting ?? {};
  const bowling = raw?.bowling ?? {};
  const fielding = raw?.fielding ?? {};

  pushList(PSL_LEADER_CATEGORIES.BATTING, "top_runs", batting.top_runs, "total");
  pushList(PSL_LEADER_CATEGORIES.BATTING, "highest_score", batting.highest_score, "total");
  pushList(PSL_LEADER_CATEGORIES.BATTING, "top_average", batting.top_average, "average");
  pushList(PSL_LEADER_CATEGORIES.BATTING, "top_strike_rate", batting.top_strike_rate, "rate");
  pushList(PSL_LEADER_CATEGORIES.BATTING, "top_fifties", batting.top_fifties, "total");
  pushList(PSL_LEADER_CATEGORIES.BATTING, "top_hundreds", batting.top_hundreds, "total");
  pushList(PSL_LEADER_CATEGORIES.BATTING, "top_fours", batting.top_fours, "total");
  pushList(PSL_LEADER_CATEGORIES.BATTING, "top_sixes", batting.top_sixes, "total");

  pushList(PSL_LEADER_CATEGORIES.BOWLING, "top_wickets", bowling.top_wickets, "total");
  pushList(PSL_LEADER_CATEGORIES.BOWLING, "top_bowling_average", bowling.top_bowling_average, "average");
  pushList(PSL_LEADER_CATEGORIES.BOWLING, "top_economy", bowling.top_economy, "rate");
  pushList(PSL_LEADER_CATEGORIES.BOWLING, "top_maidens", bowling.top_maidens, "total");
  pushList(PSL_LEADER_CATEGORIES.BOWLING, "top_dot_balls", bowling.top_dot_balls, "total");

  pushList(PSL_LEADER_CATEGORIES.FIELDING, "top_catches", fielding.top_catches, "total");

  return leaders;
}

/**
 * Normalize a Sportradar standings payload into canonical team standing rows.
 */
export function normalizeStandings(raw) {
  const rows = [];
  for (const standing of raw ?? []) {
    for (const group of standing.groups ?? []) {
      for (const ts of group.team_standings ?? []) {
        rows.push({
          teamId: ts.team?.id ?? null,
          teamName: ts.team?.name ?? "Unknown",
          teamAbbr: ts.team?.abbreviation ?? null,
          rank: ts.rank ?? 0,
          played: ts.played ?? 0,
          won: ts.win ?? 0,
          lost: ts.loss ?? 0,
          tied: ts.draw ?? 0,
          noResult: ts.no_result ?? 0,
          points: ts.points ?? 0,
          netRunRate: ts.net_run_rate ?? 0,
          runsFor: ts.runs_for ?? 0,
          runsAgainst: ts.runs_against ?? 0,
          oversFor: ts.overs_for ?? 0,
          oversAgainst: ts.overs_against ?? 0,
          change: ts.change ?? 0,
        });
      }
    }
  }
  return rows.sort((a, b) => a.rank - b.rank);
}

/**
 * Normalize a Sportradar schedule payload into canonical fixture rows.
 */
export function normalizeSchedule(raw) {
  const fixtures = [];
  for (const se of raw ?? []) {
    const competitors = se.competitors ?? [];
    const home = competitors.find((c) => c.qualifier === "home");
    const away = competitors.find((c) => c.qualifier === "away");
    const result =
      se.status === "closed" || se.status === "cancelled"
        ? (se.match_status ?? null)
        : null;

    fixtures.push({
      matchId: se.id,
      status: se.status ?? null,
      scheduled: se.scheduled ?? null,
      homeTeamId: home?.id ?? null,
      homeTeamName: home?.name ?? null,
      homeTeamAbbr: home?.abbreviation ?? null,
      awayTeamId: away?.id ?? null,
      awayTeamName: away?.name ?? null,
      awayTeamAbbr: away?.abbreviation ?? null,
      venue: se.venue?.name ?? null,
      resultText: result,
      round: se.tournament_round?.name ?? null,
      seasonId: se.season?.id ?? null,
    });
  }
  return fixtures.sort((a, b) => (a.scheduled ?? "").localeCompare(b.scheduled ?? ""));
}

/**
 * Normalize a Sportradar squads payload into { team, players[] }.
 */
export function normalizeSquad(raw) {
  const team = raw?.team ?? {};
  const players = (raw?.players ?? []).map((p) => ({
    playerId: p.id,
    playerName: p.full_name ?? p.name ?? "Unknown",
    playerShortName: p.name ?? null,
    role: p.type ?? null,
    battingStyle: p.batting_style ?? null,
    bowlingStyle: p.bowling_style ?? null,
    nationality: p.nationality ?? p.country_code ?? null,
    dateOfBirth: p.date_of_birth ?? null,
    jerseyNumber: p.jersey_number ?? null,
  }));
  return {
    teamId: team.id ?? null,
    teamName: team.name ?? "Unknown",
    teamAbbr: team.abbreviation ?? null,
    manager: raw?.manager?.name ?? null,
    players,
  };
}
