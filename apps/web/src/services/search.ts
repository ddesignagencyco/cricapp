import { fetchMatches } from './matches';
import { fetchPlayers } from './players';
import { fetchTeams } from './teams';
import { fetchTournaments } from './tournaments';
import type { Match, Player, SearchResults, Team, TournamentApi } from '../types/index';

const emptyResults = (): SearchResults => ({ players: [], teams: [], matches: [], tournaments: [] });

function includes(value: unknown, query: string): boolean {
  return typeof value === 'string' && value.toLowerCase().includes(query);
}

function matchSearchText(match: Match): string {
  const teams = match.teams;
  const sides = teams && typeof teams === 'object' ? [teams.home, teams.away] : [];
  return [
    match.tournamentName,
    match.tournament,
    match.venue,
    match.city,
    match.matchId,
    match.id,
    ...sides.flatMap((side) => side ? [side.name, side.code, side.teamId] : []),
  ].filter(Boolean).join(' ').toLowerCase();
}

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim().toLowerCase();
  if (!q) return emptyResults();

  const responses = await Promise.allSettled([
    fetchPlayers({ q }),
    fetchTeams({ limit: 100 }),
    fetchMatches({ limit: 100 }),
    fetchTournaments({ limit: 100 }),
  ]);

  const rawPlayers = responses[0].status === 'fulfilled' ? responses[0].value : [];
  const teams = responses[1].status === 'fulfilled' ? responses[1].value : [];
  const matches = responses[2].status === 'fulfilled' ? responses[2].value : [];
  const tournaments = responses[3].status === 'fulfilled' ? responses[3].value : [];

  const players: Player[] = rawPlayers.map((p: any) => {
    const displayName = p.name || p.fullName || p.shortName || 'Player';
    const teamName = p.teamName || p.team?.name || p.team?.abbr || '';
    return {
      ...p,
      name: displayName,
      fullName: p.fullName || displayName,
      teamName,
      role: p.role || '',
    };
  });

  // Deduplicate teams by ID or name
  const seenTeams = new Set<string>();
  const uniqueTeams: Team[] = [];
  for (const team of teams) {
    const key = (team.id || team.name || '').toLowerCase();
    if (!seenTeams.has(key)) {
      seenTeams.add(key);
      uniqueTeams.push(team);
    }
  }

  return {
    players: players.filter((player: Player) => [player.name, player.fullName, player.teamName, player.role].some((value) => includes(value, q))).slice(0, 5),
    teams: uniqueTeams.filter((team: Team) => [team.name, team.shortName, team.code, team.city, team.country].some((value) => includes(value, q))).slice(0, 5),
    matches: matches.filter((match: Match) => matchSearchText(match).includes(q)).slice(0, 5),
    tournaments: tournaments.filter((tournament: TournamentApi) => [tournament.name, tournament.type, tournament.category, tournament.gender].some((value) => includes(value, q))).slice(0, 5),
  };
}
