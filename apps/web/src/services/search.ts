import { apiGet } from './api/client';
import { fetchMatches } from './matches';
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

  try {
    const results = await apiGet('/search', { q });
    if (results) {
      return results as SearchResults;
    }
  } catch (err) {
    console.error('Search API failed', err);
  }

  return { players: [], teams: [], matches: [], tournaments: [] };
}
