import { player, rememberAuthor, rememberPlayer, rememberSeries, rememberTeam, rememberVenue, slugify, team } from './refs';
import type {
  Article,
  Ball,
  BallOutcome,
  BatterLine,
  BowlerLine,
  Format,
  Innings,
  InningsScore,
  Match,
  MatchStatus,
  NewsCategory,
  OverSummary,
  Player,
  Role,
  Short,
  Standing,
  Video,
} from './types';

/*
 * API → app model. The CricApp API serves Sportradar-shaped data; these
 * mappers turn it into the app's domain types (data/types.ts) and register
 * every team, player and series they meet so `team(id)` etc. resolve
 * synchronously everywhere.
 */

/* ---------------------------------------------------------------- raw shapes */

type Side = { id?: string; code?: string; name?: string; score?: string; overs?: string; oversBalls?: number | null };

export interface RawMatch {
  matchId: string;
  status: string;
  teams: string[] | { home: Side; away: Side };
  teamNames?: string[];
  teamScores?: { home?: Side; away?: Side } | null;
  tournament?: string | null;
  tournamentId?: string | null;
  venue?: string | null;
  scheduled?: string | null;
  currentInnings?: { runs?: number; overs?: number; runRate?: number; wickets?: number; battingTeam?: string } | null;
  displayScore?: string | null;
  matchStatus?: string | null;
  result?: string | null;
  matchResult?: string | null;
  winnerId?: string | null;
  tossWonBy?: string | null;
  tossDecision?: string | null;
  periodScores?: RawPeriod[] | null;
  displayOvers?: number | null;
}

interface RawPeriod {
  number: number;
  type?: string;
  home_score?: number;
  away_score?: number;
  home_wickets?: number;
  away_wickets?: number;
  display_overs?: number | string;
  allotted_overs?: number;
}

export interface RawPerson {
  id: string;
  name: string;
  country_code?: string;
}

export interface RawTimelineEvent {
  id: number;
  type: string;
  inning?: number;
  over_number?: number;
  ball_number?: number;
  display_overs?: string;
  display_score?: string;
  period_name?: string;
  commentary?: { text?: string };
  batting_params?: { striker?: RawPerson; runs_scored?: number; hit_to_boundary?: boolean };
  bowling_params?: { bowler?: RawPerson; extra_runs_type?: string; extra_runs_conceded?: number };
}

interface RawBatStat {
  runs?: number;
  balls_faced?: number;
  fours?: number;
  sixes?: number;
  order?: number;
  dismissal?: { type?: string; bowler_id?: string; fielder_id?: string };
}
interface RawBowlStat {
  overs_bowled?: number;
  conceded_runs?: number;
  wickets?: number;
  maidens?: number;
  wides?: number;
  no_balls?: number;
}
interface RawInningsTeam {
  id: string;
  name: string;
  statistics: {
    batting?: { runs?: number; players?: { id: string; name: string; statistics: RawBatStat }[] };
    bowling?: { players?: { id: string; name: string; statistics: RawBowlStat }[] };
  };
}
export interface RawTimeline {
  payload?: {
    timeline?: RawTimelineEvent[];
    sport_event_timeline?: { timeline?: RawTimelineEvent[] };
    statistics?: { innings?: { number: number; batting_team?: string; bowling_team?: string; teams: RawInningsTeam[] }[] };
    sport_event?: {
      competitors?: { id: string; name: string; abbreviation?: string; qualifier?: string }[];
      venue?: { id: string; name: string; city_name?: string; country_name?: string };
      tournament?: { id: string; name: string; type?: string };
      sport_event_conditions?: { referees?: Record<string, { name?: string }> };
    };
  };
}

export interface RawNews {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string | null;
  imageUrl?: string | null;
  author?: string | null;
  categoryId?: string | null;
  category?: { name?: string; slug?: string } | null;
  language?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  teamIds?: string[];
  playerIds?: string[];
  matchIds?: string[];
  seriesIds?: string[];
  linkedTeams?: { id: string }[];
}

export interface RawGallery {
  id: string;
  title?: string | null;
  caption?: string | null;
  type: 'image' | 'short' | 'video';
  url: string;
  thumbnailUrl?: string | null;
  duration?: number | null;
  createdAt: string;
}

export interface RawPlayer {
  id: string;
  fullName: string;
  shortName?: string | null;
  role?: string | null;
  battingStyle?: string | null;
  bowlingStyle?: string | null;
  birth?: string | null;
  nationality?: string | null;
  team?: { id: string; name: string; abbr?: string; logoUrl?: string | null } | null;
}

export interface RawStanding {
  teamId: string;
  teamName: string;
  teamAbbr?: string;
  rank?: number;
  played: number;
  won: number;
  lost: number;
  tied?: number;
  noResult?: number;
  points: number;
  netRunRate?: number;
}

/* ---------------------------------------------------------------- helpers */

/** "18.1" overs → 109 balls. */
export function oversToBalls(overs?: number | string | null): number {
  if (overs === null || overs === undefined || overs === '') return 0;
  const [o, b] = String(overs).split('.');
  return (Number(o) || 0) * 6 + (Number(b) || 0);
}

/** "Shah, Rahmat" → "Rahmat Shah". */
export function displayName(name: string) {
  const parts = name.split(',').map(s => s.trim());
  return parts.length === 2 && parts[1] ? `${parts[1]} ${parts[0]}` : name;
}

const shortName = (name: string) => {
  const full = displayName(name).split(' ');
  return full.length > 1 ? `${full[0][0]} ${full.slice(1).join(' ')}` : full[0];
};

function formatOf(...hints: (string | null | undefined)[]): Format {
  const h = hints.filter(Boolean).join(' ').toLowerCase();
  if (/\btest\b/.test(h)) return 'Test';
  if (/\bt10\b/.test(h)) return 'T10';
  if (/\bodi\b|one.?day|50.?over|list a/.test(h)) return 'ODI';
  return 'T20';
}

const STATUS: Record<string, MatchStatus> = {
  live: 'live',
  inprogress: 'live',
  interrupted: 'break',
  delayed: 'break',
  upcoming: 'upcoming',
  not_started: 'upcoming',
  scheduled: 'upcoming',
  completed: 'completed',
  closed: 'completed',
  ended: 'completed',
  cancelled: 'completed',
  abandoned: 'completed',
};

/** Id used for a team that came without a provider id (list rows sometimes only carry codes). */
const codeId = (code: string) => `code:${code}`;

function sides(m: RawMatch): { home: Side; away: Side } {
  if (!Array.isArray(m.teams) && m.teams?.home) return m.teams;
  const codes = Array.isArray(m.teams) ? m.teams : [];
  const names = m.teamNames ?? [];
  return {
    home: { ...(m.teamScores?.home ?? {}), code: codes[0] ?? m.teamScores?.home?.code, name: names[0] ?? m.teamScores?.home?.name },
    away: { ...(m.teamScores?.away ?? {}), code: codes[1] ?? m.teamScores?.away?.code, name: names[1] ?? m.teamScores?.away?.name },
  };
}

function rememberSide(s: Side) {
  const id = s.id ?? codeId(s.code ?? s.name ?? '?');
  rememberTeam({ id, name: s.name ?? s.code ?? 'TBC', short: s.code });
  return id;
}

const parseScore = (score?: string) => {
  const [r, w] = (score ?? '').split('/');
  return { runs: Number(r) || 0, wickets: w === undefined ? 10 : Number(w) || 0 };
};

/* ---------------------------------------------------------------- matches */

export function toMatch(m: RawMatch): Match {
  const { home, away } = sides(m);
  const teamA = rememberSide(home);
  const teamB = rememberSide(away);
  const status = STATUS[m.status] ?? STATUS[m.matchStatus ?? ''] ?? 'upcoming';
  const format = formatOf(m.tournament);

  const seriesId = m.tournamentId ?? (m.tournament ? `name:${slugify(m.tournament)}` : 'other');
  if (m.tournament) {
    rememberSeries({
      id: seriesId,
      name: m.tournament,
      short: m.tournament,
      slug: slugify(m.tournament),
      format,
      kind: /league|super|premier|bash/i.test(m.tournament) ? 'league' : /series/i.test(m.tournament) ? 'bilateral' : 'tournament',
      start: m.scheduled ?? '',
      end: m.scheduled ?? '',
      teamIds: [teamA, teamB],
      color: team(teamA).color,
    });
  }
  if (m.venue) rememberVenue({ id: m.venue, name: m.venue, city: '', country: '', avgFirstInnings: 0, paceShare: 0 });

  // Innings: period scores carry each innings for one side; fall back to the side totals.
  const innings: InningsScore[] = [];
  for (const p of (m.periodScores ?? []).filter(x => !x.type || x.type === 'inning')) {
    const homeBat = p.home_wickets !== undefined || (p.home_score ?? 0) > 0;
    innings.push({
      teamId: homeBat ? teamA : teamB,
      runs: (homeBat ? p.home_score : p.away_score) ?? 0,
      wickets: (homeBat ? p.home_wickets : p.away_wickets) ?? 0,
      balls: oversToBalls(p.display_overs),
    });
  }
  if (!innings.length) {
    for (const [s, id] of [
      [home, teamA],
      [away, teamB],
    ] as const) {
      if (!s.score) continue;
      const { runs, wickets } = parseScore(s.score);
      innings.push({ teamId: id, runs, wickets, balls: oversToBalls(s.overs ?? s.oversBalls) });
    }
  }
  // Pad overs the period rows lack from the side totals ("20" overs).
  for (const inn of innings) {
    if (inn.balls) continue;
    const s = inn.teamId === teamA ? home : away;
    inn.balls = oversToBalls(s.overs ?? s.oversBalls);
  }

  const battingCode = m.currentInnings?.battingTeam;
  const battingTeamId =
    status === 'live' && battingCode ? (team(teamA).short === battingCode ? teamA : team(teamB).short === battingCode ? teamB : undefined) : undefined;
  const resultText = m.result ?? m.matchResult ?? undefined;
  const toss =
    m.tossWonBy && (m.tossWonBy === home.id || m.tossWonBy === away.id)
      ? `${team(m.tossWonBy).name} won the toss${m.tossDecision ? ` and chose to ${m.tossDecision}` : ''}`
      : undefined;

  const first = innings[0];
  const target = innings.length >= 2 && format !== 'Test' ? first.runs + 1 : undefined;

  return {
    id: m.matchId,
    slug: slugify(`${team(teamA).short}-v-${team(teamB).short}`),
    seriesId,
    title: `${team(teamA).name} v ${team(teamB).name}`,
    format,
    status,
    startTime: m.scheduled ?? new Date().toISOString(),
    venueId: m.venue ?? '',
    teamA,
    teamB,
    innings,
    statusText:
      status === 'live'
        ? liveLine(innings, target, battingTeamId)
        : status === 'break'
          ? 'Play interrupted'
          : /cancel|abandon/i.test(`${m.status} ${m.matchStatus ?? ''}`)
            ? (resultText ?? 'Match cancelled')
            : (resultText ?? (status === 'completed' && !innings.length ? 'Scores not available' : '')),
    toss,
    result: status === 'completed' && resultText ? { winnerId: m.winnerId ?? undefined, text: resultText } : undefined,
    battingTeamId,
    target,
    live:
      status === 'live'
        ? { crr: m.currentInnings?.runRate ?? 0, recent: [] }
        : undefined,
  };
}

function liveLine(innings: InningsScore[], target?: number, batting?: string) {
  const cur = innings[innings.length - 1];
  if (!cur) return 'Live';
  if (target && innings.length >= 2) {
    const need = target - cur.runs;
    return need > 0 ? `${team(batting ?? cur.teamId).name} need ${need} runs` : 'Target reached';
  }
  return `${team(cur.teamId).short} ${cur.runs}/${cur.wickets}`;
}

/* ---------------------------------------------------------------- timeline */

function rememberPerson(p: RawPerson, teamId: string) {
  if (!player(p.id))
    rememberPlayer({
      id: p.id,
      name: displayName(p.name),
      short: shortName(p.name),
      teamId,
      role: 'Player',
      batting: '',
      slug: slugify(displayName(p.name)),
      stats: {},
      recent: [],
    });
  return p.id;
}

const DISMISSAL: Record<string, string> = {
  bowled: 'b',
  caught: 'c',
  lbw: 'lbw',
  run_out: 'run out',
  stumped: 'st',
  caught_and_bowled: 'c & b',
  hit_wicket: 'hit wicket',
};

function dismissalText(d: RawBatStat['dismissal'], name: (id?: string) => string) {
  if (!d?.type) return undefined;
  const t = d.type;
  if (t === 'caught') return `c ${name(d.fielder_id)} b ${name(d.bowler_id)}`;
  if (t === 'stumped') return `st ${name(d.fielder_id)} b ${name(d.bowler_id)}`;
  if (t === 'caught_and_bowled') return `c & b ${name(d.bowler_id)}`;
  if (t === 'run_out') return `run out${d.fielder_id ? ` (${name(d.fielder_id)})` : ''}`;
  if (t === 'bowled' || t === 'lbw') return `${DISMISSAL[t]} ${name(d.bowler_id)}`;
  return (DISMISSAL[t] ?? t.replace(/_/g, ' ')) + (d.bowler_id ? ` b ${name(d.bowler_id)}` : '');
}

const events = (t: RawTimeline) => t.payload?.timeline ?? t.payload?.sport_event_timeline?.timeline ?? [];

/** Full scorecard from the stored Sportradar statistics. */
export function toScorecard(t: RawTimeline): Innings[] {
  const comps = t.payload?.sport_event?.competitors ?? [];
  for (const c of comps) rememberTeam({ id: c.id, name: c.name, short: c.abbreviation });
  const list = t.payload?.statistics?.innings ?? [];
  const evs = events(t);
  const name = (id?: string) => (id ? player(id)?.short ?? '' : '');

  return list.map(inn => {
    const batTeam = inn.teams.find(x => x.id === inn.batting_team) ?? inn.teams.find(x => x.statistics.batting?.players?.length) ?? inn.teams[0];
    const bowlTeam = inn.teams.find(x => x.id !== batTeam.id) ?? inn.teams[1];
    const bats = [...(batTeam?.statistics.batting?.players ?? [])].sort((a, b) => (a.statistics.order ?? 99) - (b.statistics.order ?? 99));
    const bowls = bowlTeam?.statistics.bowling?.players ?? [];
    bats.forEach(p => rememberPerson(p, batTeam.id));
    bowls.forEach(p => rememberPerson(p, bowlTeam.id));

    const batting: BatterLine[] = bats.map(p => ({
      playerId: p.id,
      runs: p.statistics.runs ?? 0,
      balls: p.statistics.balls_faced ?? 0,
      fours: p.statistics.fours ?? 0,
      sixes: p.statistics.sixes ?? 0,
      dismissal: dismissalText(p.statistics.dismissal, name),
    }));
    const bowling: BowlerLine[] = bowls.map(p => ({
      playerId: p.id,
      balls: oversToBalls(p.statistics.overs_bowled),
      maidens: p.statistics.maidens ?? 0,
      runs: p.statistics.conceded_runs ?? 0,
      wickets: p.statistics.wickets ?? 0,
    }));

    // Over-by-over runs and wickets for the charts, from this innings' balls.
    const balls = evs.filter(e => e.inning === inn.number && e.over_number && ['ball', 'boundary', 'six', 'wicket'].includes(e.type));
    const overRuns: number[] = [];
    const overWickets: number[] = [];
    for (const e of balls) {
      const o = (e.over_number ?? 1) - 1;
      overRuns[o] = (overRuns[o] ?? 0) + (e.batting_params?.runs_scored ?? 0) + (e.bowling_params?.extra_runs_conceded ?? 0);
      overWickets[o] = (overWickets[o] ?? 0) + (e.type === 'wicket' ? 1 : 0);
    }
    const wides = bowls.reduce((n, p) => n + (p.statistics.wides ?? 0), 0);
    const noBalls = bowls.reduce((n, p) => n + (p.statistics.no_balls ?? 0), 0);
    const total = batTeam?.statistics.batting?.runs ?? 0;
    const fromBat = batting.reduce((n, b) => n + b.runs, 0);
    const other = Math.max(0, total - fromBat - wides - noBalls);

    return {
      teamId: batTeam?.id ?? '',
      batting,
      bowling,
      extras: { byes: 0, legByes: other, wides, noBalls },
      fow: [],
      overRuns: Array.from(overRuns, v => v ?? 0),
      overWickets: Array.from(overWickets, v => v ?? 0),
      yetToBat: [],
    };
  });
}

function outcomeOf(e: RawTimelineEvent): BallOutcome {
  const extra = e.bowling_params?.extra_runs_type;
  const runs = e.batting_params?.runs_scored ?? 0;
  if (e.type === 'wicket') return { kind: 'wicket', text: 'W' };
  if (extra) {
    const label = extra === 'wide' ? 'wd' : extra === 'no_ball' ? 'nb' : extra === 'leg_bye' ? 'lb' : 'b';
    return { kind: 'extra', label, runs: (e.bowling_params?.extra_runs_conceded ?? 0) + runs };
  }
  if (e.type === 'six' || runs === 6) return { kind: 'six' };
  if (e.type === 'boundary' || (runs === 4 && e.batting_params?.hit_to_boundary)) return { kind: 'four' };
  return { kind: 'runs', runs };
}

/** Ball-by-ball commentary, newest first, plus per-over summaries. */
export function toCommentary(t: RawTimeline): { balls: Ball[]; overs: OverSummary[] } {
  const evs = events(t).filter(e => ['ball', 'boundary', 'six', 'wicket'].includes(e.type) && e.display_overs);
  const balls: Ball[] = evs.map(e => ({
    id: String(e.id),
    over: e.display_overs ?? '',
    outcome: outcomeOf(e),
    text: e.commentary?.text ?? '',
    bowler: e.bowling_params?.bowler ? displayName(e.bowling_params.bowler.name) : '',
    batter: e.batting_params?.striker ? displayName(e.batting_params.striker.name) : '',
    inning: e.inning,
  }));

  const overs: OverSummary[] = [];
  const byOver = new Map<string, RawTimelineEvent[]>();
  for (const e of evs) {
    const k = `${e.inning}:${e.over_number}`;
    byOver.set(k, [...(byOver.get(k) ?? []), e]);
  }
  for (const list of byOver.values()) {
    const last = list[list.length - 1];
    overs.push({
      over: last.over_number ?? 0,
      runs: list.reduce((n, e) => n + (e.batting_params?.runs_scored ?? 0) + (e.bowling_params?.extra_runs_conceded ?? 0), 0),
      wickets: list.filter(e => e.type === 'wicket').length,
      score: last.display_score ?? '',
      bowler: last.bowling_params?.bowler ? displayName(last.bowling_params.bowler.name) : '',
      balls: list.map(outcomeOf),
    });
  }
  return { balls: balls.reverse(), overs: overs.reverse() };
}

/** Venue, umpires and referee from the stored match payload. */
export function matchExtras(t: RawTimeline): Partial<Match> {
  const se = t.payload?.sport_event;
  if (!se) return {};
  if (se.venue) {
    rememberVenue({
      id: se.venue.id,
      name: se.venue.name,
      city: se.venue.city_name ?? '',
      country: se.venue.country_name ?? '',
      avgFirstInnings: 0,
      paceShare: 0,
    });
  }
  const refs = Object.values(se.sport_event_conditions?.referees ?? {}).map(r => r.name && displayName(r.name)).filter(Boolean) as string[];
  return { venueId: se.venue?.id ?? '', referee: refs[0], umpires: refs.slice(1) };
}

/* ---------------------------------------------------------------- news & media */

const CATEGORY: Record<string, NewsCategory> = {
  breaking: 'Breaking',
  'pakistan-cricket': 'Pakistan',
  psl: 'PSL',
  international: 'International',
  'match-news': 'Match News',
  analysis: 'Analysis',
  features: 'Features',
  records: 'Records',
  interviews: 'Interviews',
  explainers: 'Explainers',
};

/** Category slugs by id, loaded once from /news/categories. */
export const categoryIndex = new Map<string, string>();

const stripTags = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, '’')
    .trim();

export function toArticle(n: RawNews): Article {
  const slug = n.category?.slug ?? (n.categoryId ? categoryIndex.get(n.categoryId) : undefined) ?? '';
  const category = CATEGORY[slug] ?? 'International';
  const body = (n.content ?? '')
    .split(/<\/p>|<\/h\d>|\n{2,}/i)
    .map(stripTags)
    .filter(Boolean);
  const words = body.join(' ').split(/\s+/).length;
  const a = rememberAuthor(n.author?.trim() || 'PCZ Desk');
  return {
    id: n.id,
    slug: n.slug,
    lang: n.language === 'ur' ? 'ur' : 'en',
    title: n.title,
    summary: n.summary ?? body[0] ?? '',
    body,
    category,
    authorId: a.id,
    publishedAt: n.publishedAt ?? n.createdAt ?? new Date().toISOString(),
    updatedAt: n.updatedAt,
    readMinutes: Math.max(1, Math.round(words / 220)),
    breaking: category === 'Breaking',
    teamIds: n.teamIds ?? n.linkedTeams?.map(t => t.id) ?? [],
    playerIds: n.playerIds ?? [],
    matchId: n.matchIds?.[0],
    seriesId: n.seriesIds?.[0],
    image: n.imageUrl ?? undefined,
  };
}

/** Gallery images become one swipeable story; each video short is its own reel. */
export function toShorts(items: RawGallery[]): Short[] {
  const images = items.filter(i => i.type === 'image');
  const shorts: Short[] = items
    .filter(i => i.type === 'short')
    .map(i => ({
      id: i.id,
      kind: 'short' as const,
      title: i.title || 'Highlights',
      teamIds: [],
      photo: i.thumbnailUrl ?? undefined,
      slides: [{ headline: i.title || '', caption: i.caption || '', photo: i.thumbnailUrl ?? undefined, teamIds: [] }],
      views: 0,
      publishedAt: i.createdAt,
      videoUrl: i.url,
    }));
  if (images.length) {
    shorts.push({
      id: 'gallery-latest',
      kind: 'gallery',
      title: 'Latest photos',
      teamIds: [],
      photo: images[0].url,
      slides: images.map(i => ({ headline: i.title || '', caption: i.caption || '', photo: i.url, teamIds: [] })),
      views: 0,
      publishedAt: images[0].createdAt,
    });
  }
  return shorts;
}

export function toVideo(i: RawGallery): Video {
  const secs = Math.round(i.duration ?? 0);
  return {
    id: i.id,
    title: i.title || 'Video',
    duration: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
    teamIds: [],
    photo: i.thumbnailUrl ?? undefined,
    views: 0,
    publishedAt: i.createdAt,
    category: i.type === 'short' ? 'Shorts' : 'Video',
    url: i.url,
  };
}

/* ---------------------------------------------------------------- people & tables */

const ROLE: Record<string, Role> = {
  batsman: 'Batter',
  batter: 'Batter',
  bowler: 'Bowler',
  all_rounder: 'All-rounder',
  allrounder: 'All-rounder',
  wicket_keeper: 'Wicketkeeper',
  wicketkeeper: 'Wicketkeeper',
  wicketkeeper_batsman: 'Wicketkeeper',
};

export function toPlayer(p: RawPlayer, fallbackTeam?: string): Player {
  if (p.team) rememberTeam({ id: p.team.id, name: p.team.name, short: p.team.abbr, logoUrl: p.team.logoUrl });
  const born = p.birth ?? undefined;
  const age = born ? Math.floor((Date.now() - +new Date(born)) / (365.25 * 86_400_000)) : undefined;
  const name = displayName(p.fullName);
  return rememberPlayer({
    id: p.id,
    name,
    short: p.shortName ? shortName(p.shortName) : shortName(p.fullName),
    teamId: p.team?.id ?? fallbackTeam ?? '',
    role: ROLE[(p.role ?? '').toLowerCase()] ?? 'Player',
    batting: p.battingStyle?.replace(/_/g, ' ') ?? '',
    bowling: p.bowlingStyle?.replace(/_/g, ' ') ?? undefined,
    born,
    age: Number.isFinite(age) ? age : undefined,
    slug: slugify(name),
    nationality: p.nationality ?? undefined,
    stats: {},
    recent: [],
  });
}

export function toStanding(s: RawStanding): Standing {
  rememberTeam({ id: s.teamId, name: s.teamName, short: s.teamAbbr, kind: 'franchise' });
  return {
    teamId: s.teamId,
    played: s.played,
    won: s.won,
    lost: s.lost,
    noResult: (s.noResult ?? 0) + (s.tied ?? 0),
    points: s.points,
    nrr: s.netRunRate ?? 0,
    form: [],
  };
}
