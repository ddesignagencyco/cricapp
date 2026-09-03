import { teams } from '../data/teams';
import { players } from '../data/players';
import { matches, getMatchById } from '../data/matches';
import { tournaments } from '../data/tournaments';
import { news } from '../data/news';
import { streams } from '../data/streams';

/**
 * SERVICE LAYER
 * ------------------------------------------------------------------
 * This module is the single point of access for all cricket data used
 * across the application. It currently reads from local mock data but
 * is structured so that the underlying source can be swapped for a
 * real cricket API later without touching any UI component.
 *
 * To connect a live API later, replace the internals of these functions
 * with network calls and map the response into the same structured shape
 * that the UI already consumes.
 */

const delay = (ms = 100) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAsPromise(data, ms) {
  await delay(ms);
  return data;
}

/** Returns all teams (optionally filtered to PSL only). */
export async function fetchTeams({ pslOnly = false, id } = {}) {
  let list = teams;
  if (pslOnly) {
    const pslTeamIds = tournaments.find((t) => t.id === 't1').teams;
    list = teams.filter((t) => pslTeamIds.includes(t.id));
  }
  if (id) {
    list = teams.filter((t) => t.id === id);
  }
  return fetchAsPromise(list);
}

/** Returns a single team by id. */
export async function fetchTeamById(id) {
  return fetchAsPromise(teams.find((t) => t.id === id) || null);
}

/** Returns the six PSL franchises. */
export async function fetchPSLTeams() {
  const pslTeamIds = tournaments.find((t) => t.id === 't1').teams;
  return fetchAsPromise(teams.filter((t) => pslTeamIds.includes(t.id)));
}

/** Returns players with optional filtering. */
export async function fetchPlayers(filters = {}, { id } = {}) {
  let list = players;
  if (filters.id) {
    return fetchAsPromise(players.find((p) => p.id === filters.id) || null);
  }
  if (id) {
    return fetchAsPromise(players.find((p) => p.id === id) || null);
  }
  if (filters.teamId) {
    list = list.filter((p) => p.teamId === filters.teamId);
  }
  if (filters.country) {
    list = list.filter((p) => p.country === filters.country);
  }
  if (filters.role) {
    list = list.filter((p) => p.role === filters.role);
  }
  if (filters.battingStyle) {
    list = list.filter((p) => p.battingStyle === filters.battingStyle);
  }
  if (filters.bowlingStyle) {
    list = list.filter((p) => p.bowlingStyle === filters.bowlingStyle);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q));
  }
  return fetchAsPromise(list);
}

/** Returns matches, optionally by status. */
export async function fetchMatches({ status, tournamentId, teamId } = {}) {
  let list = matches;
  if (status) {
    list = list.filter((m) => m.status === status);
  }
  if (tournamentId) {
    list = list.filter((m) => m.tournamentId === tournamentId);
  }
  if (teamId) {
    list = list.filter(
      (m) => m.teams.home.teamId === teamId || m.teams.away.teamId === teamId
    );
  }
  return fetchAsPromise(list);
}

/** Returns a single match by id. */
export async function fetchMatchById(id) {
  return fetchAsPromise(getMatchById(id));
}

/** Returns all tournaments. */
export async function fetchTournaments({ id } = {}) {
  if (id) {
    return fetchAsPromise(tournaments.find((t) => t.id === id) || null);
  }
  return fetchAsPromise(tournaments);
}

/** Returns news articles. */
export async function fetchNews({ category, type } = {}) {
  let list = news;
  if (category) {
    list = list.filter((n) => n.category === category);
  }
  if (type) {
    list = list.filter((n) => n.type === type);
  }
  return fetchAsPromise(list);
}

/** Returns a single news article by id. */
export async function fetchNewsById(id) {
  return fetchAsPromise(news.find((n) => n.id === id) || null);
}

/** Returns live streams (optionally by status / match). */
export async function fetchStreams({ status, matchId } = {}) {
  let list = streams;
  if (status) {
    list = list.filter((s) => s.status === status);
  }
  if (matchId) {
    list = list.filter((s) => s.matchId === matchId);
  }
  return fetchAsPromise(list);
}

/** Returns a single stream by id. */
export async function fetchStreamById(id) {
  return fetchAsPromise(streams.find((s) => s.id === id) || null);
}

/** Global search across players, teams, matches and tournaments. */
export async function searchAll(query) {
  const q = query.trim().toLowerCase();
  if (!q) return { players: [], teams: [], matches: [], tournaments: [] };

  const playerResults = players
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
    )
    .slice(0, 6);

  const teamResults = teams
    .filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q)
    )
    .slice(0, 6);

  const matchResults = matches
    .filter((m) => {
      const searchable = [
        m.tournamentName,
        m.teams.home.name,
        m.teams.away.name,
        m.teams.home.code,
        m.teams.away.code,
        m.venue,
        m.matchNumber && String(m.matchNumber),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    })
    .slice(0, 6);

  const tournamentResults = tournaments
    .filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q)
    )
    .slice(0, 4);

  return {
    players: playerResults,
    teams: teamResults,
    matches: matchResults,
    tournaments: tournamentResults,
  };
}

export { teams, players, matches, tournaments, news, streams };
