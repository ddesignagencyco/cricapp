import { fetchMatches } from './matches';
import { teams } from '../data/teams';
import { players } from '../data/players';
import { tournaments } from '../data/tournaments';
import { MatchSummary, SearchResults } from '../types/index';

function toMatchItem(m: any): MatchSummary {
  const names = m.teamNames || m.teams || [];
  return {
    id: m.matchId,
    teams: m.teams || [],
    teamNames: m.teamNames || [],
    label: names.join(' vs '),
    status: m.status,
    tournament: m.tournament,
    venue: m.venue,
  } as MatchSummary;
}

export async function searchAll(query: string): Promise<SearchResults> {
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

  let matchResults: MatchSummary[] = [];
  try {
    const all = await fetchMatches();
    matchResults = (all || [])
      .filter((m) => {
        const searchable = [
          m.tournament,
          ...(m.teamNames || []),
          ...(m.teams || []),
          m.venue,
        ]
          .join(' ')
          .toLowerCase();
        return searchable.includes(q);
      })
      .slice(0, 6)
      .map(toMatchItem);
  } catch {
    matchResults = [];
  }

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
