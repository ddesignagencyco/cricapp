import { teams } from '../data/teams';
import { players } from '../data/players';
import { matches, getMatchById } from '../data/matches';
import { tournaments } from '../data/tournaments';
import { news } from '../data/news';
import { streams } from '../data/streams';
import {
  Team,
  Player,
  MatchSummary,
  Tournament,
  NewsArticle,
  Stream,
  SearchResults,
} from '../types/index';

const delay = (ms: number = 100): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function fetchAsPromise<T>(data: T, ms?: number): Promise<T> {
  await delay(ms);
  return data;
}

export async function fetchTeams(
  { pslOnly = false, id }: { pslOnly?: boolean; id?: string } = {}
): Promise<Team[]> {
  let list = teams;
  if (pslOnly) {
    const pslTeamIds = tournaments.find((t) => t.id === 't1')!.teams;
    list = teams.filter((t) => pslTeamIds.includes(t.id));
  }
  if (id) {
    list = teams.filter((t) => t.id === id);
  }
  return fetchAsPromise(list);
}

export async function fetchTeamById(id: string): Promise<Team | null> {
  return fetchAsPromise(teams.find((t) => t.id === id) || null);
}

export async function fetchPSLTeams(): Promise<Team[]> {
  const pslTeamIds = tournaments.find((t) => t.id === 't1')!.teams;
  return fetchAsPromise(teams.filter((t) => pslTeamIds.includes(t.id)));
}

export async function fetchPlayers(
  filters: {
    id?: string;
    teamId?: string;
    country?: string;
    role?: string;
    battingStyle?: string;
    bowlingStyle?: string;
    search?: string;
  } = {},
  { id }: { id?: string } = {}
): Promise<Player[] | Player | null> {
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

const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function parseScheduled(scheduled: string | undefined): { date: string; time: string } {
  if (!scheduled) return { date: '', time: '' };
  const d = new Date(scheduled);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    date: `${y}-${m}-${day}`,
    time: d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

function teamIdForCode(code: string | undefined): string {
  const match = teams.find((t) => t.code?.toUpperCase() === code?.toUpperCase());
  return match ? match.id : (code || '').toLowerCase();
}

function mapMatch(summary: any): MatchSummary {
  const id = summary.matchId;
  const { date, time } = parseScheduled(summary.scheduled);
  const homeCode: string = summary.teams?.[0] ?? '';
  const awayCode: string = summary.teams?.[1] ?? '';
  const homeName: string = summary.teamNames?.[0] ?? (homeCode || 'TBD');
  const awayName: string = summary.teamNames?.[1] ?? (awayCode || 'TBD');

  const battingTeam: string | undefined = summary.currentInnings?.battingTeam;

  let homeScore = '';
  let homeOvers = '';
  let awayScore = '';
  let awayOvers = '';
  const score: string = summary.displayScore || '';
  const overs: number | undefined = summary.currentInnings?.overs;
  if (summary.status === 'live' && battingTeam) {
    if (battingTeam === homeCode) {
      homeScore = score;
      homeOvers = overs ? String(overs) : '';
    } else if (battingTeam === awayCode) {
      awayScore = score;
      awayOvers = overs ? String(overs) : '';
    }
  } else if (summary.status !== 'upcoming') {
    homeScore = score;
  }

  return {
    id,
    tournamentId: null,
    tournamentName: summary.tournament || 'International Cricket',
    matchNumber: null,
    group: '',
    status: summary.status,
    venue: summary.venue || '',
    city: '',
    date,
    time,
    teams: {
      home: {
        teamId: teamIdForCode(homeCode),
        name: homeName,
        code: homeCode,
        score: homeScore,
        overs: homeOvers,
      },
      away: {
        teamId: teamIdForCode(awayCode),
        name: awayName,
        code: awayCode,
        score: awayScore,
        overs: awayOvers,
      },
    },
    toss: '',
    result: summary.status === 'completed' ? 'Match completed' : '',
    currentRunRate: summary.currentInnings?.runRate ?? null,
    batsmen: summary.currentInnings
      ? [
          {
            name: battingTeam,
            runs: summary.currentInnings.runs,
            balls: Math.floor(summary.currentInnings.overs) * 6,
            status: 'not out',
            sr: summary.currentInnings.runRate,
          },
        ]
      : [],
    battingScorecard: [],
    bowlingScorecard: [],
    fallOfWickets: [],
    partnerships: [],
    overSummary: [],
    recentBalls: [],
  } as MatchSummary;
}

export async function fetchMatches(
  { status, tournamentId, teamId }: { status?: string; tournamentId?: string; teamId?: string } = {}
): Promise<MatchSummary[]> {
  try {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (tournamentId) params.set('tournament', tournamentId);
    const qs = params.toString();
    const res = await fetch(`${API_BASE}/api/matches${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    let list: MatchSummary[] = (json || []).map(mapMatch);
    if (teamId) {
      list = list.filter(
        (m) =>
          (m as any).teams.home.teamId === teamId ||
          (m as any).teams.away.teamId === teamId
      );
    }
    return list;
  } catch (err) {
    console.error('[cricketApi] fetchMatches failed, falling back to mock data', err);
    return fetchAsPromise(matches);
  }
}

export async function fetchMatchById(id: string): Promise<MatchSummary | null> {
  try {
    const res = await fetch(
      `${API_BASE}/api/matches/${encodeURIComponent(id)}`
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    return mapMatch(json);
  } catch (err) {
    console.error('[cricketApi] fetchMatchById failed, falling back to mock data', err);
    return fetchAsPromise(getMatchById(id) || null);
  }
}

export async function fetchTournaments(
  { id }: { id?: string } = {}
): Promise<Tournament[] | Tournament | null> {
  if (id) {
    return fetchAsPromise(tournaments.find((t) => t.id === id) || null);
  }
  return fetchAsPromise(tournaments);
}

export async function fetchNews(
  { category, type }: { category?: string; type?: string } = {}
): Promise<NewsArticle[]> {
  let list = news;
  if (category) {
    list = list.filter((n) => n.category === category);
  }
  if (type) {
    list = list.filter((n) => n.type === type);
  }
  return fetchAsPromise(list);
}

export async function fetchNewsById(id: string): Promise<NewsArticle | null> {
  return fetchAsPromise(news.find((n) => n.id === id) || null);
}

export async function fetchStreams(
  { status, matchId }: { status?: string; matchId?: string } = {}
): Promise<Stream[]> {
  let list = streams;
  if (status) {
    list = list.filter((s) => s.status === status);
  }
  if (matchId) {
    list = list.filter((s) => s.matchId === matchId);
  }
  return fetchAsPromise(list);
}

export async function fetchStreamById(id: string): Promise<Stream | null> {
  return fetchAsPromise(streams.find((s) => s.id === id) || null);
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

  const matchResults = matches
    .filter((m) => {
      const searchable = [
        m.tournamentName,
        m.teams?.home.name,
        m.teams?.away.name,
        m.teams?.home.code,
        m.teams?.away.code,
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
