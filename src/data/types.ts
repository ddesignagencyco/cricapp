/**
 * Domain model for the app. It mirrors the brief's core entities (teams,
 * players, series, matches, innings, balls, articles, predictions) so the
 * mock repository can later be swapped for the NestJS API without
 * touching screens.
 */

export type Format = 'T20' | 'ODI' | 'Test' | 'T10';
export type Sport = 'cricket';

export interface Team {
  id: string;
  name: string;
  short: string;
  /** Brand colour used for badges, glows and charts. */
  color: string;
  kind: 'international' | 'franchise' | 'domestic';
  flag?: string;
  slug: string;
  logoUrl?: string;
}

/** 'Player' when the feed doesn't say which. */
export type Role = 'Batter' | 'Bowler' | 'All-rounder' | 'Wicketkeeper' | 'Player';

export interface Player {
  id: string;
  name: string;
  short: string;
  teamId: string;
  role: Role;
  batting: string;
  bowling?: string;
  born?: string;
  age?: number;
  slug: string;
  nationality?: string;
  /** Career snapshot by format (empty until the API provides career stats). */
  stats: Partial<Record<Format, PlayerFormatStats>>;
  recent: number[];
}

export interface PlayerFormatStats {
  matches: number;
  runs: number;
  average: number;
  strikeRate: number;
  hundreds: number;
  fifties: number;
  best: string;
  wickets: number;
  economy: number;
  bowlingAverage: number;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  avgFirstInnings: number;
  paceShare: number;
}

export interface Series {
  id: string;
  name: string;
  short: string;
  slug: string;
  format: Format;
  /** False when the format was guessed (the feed named no format). */
  formatKnown?: boolean;
  kind: 'bilateral' | 'tournament' | 'league';
  start: string;
  end: string;
  teamIds: string[];
  color: string;
}

export type MatchStatus = 'live' | 'upcoming' | 'completed' | 'break';

export interface InningsScore {
  teamId: string;
  runs: number;
  wickets: number;
  /** Balls bowled, so overs display is derived ("17.3"). */
  balls: number;
  declared?: boolean;
}

export interface BatterLine {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissal?: string;
  onStrike?: boolean;
}

export interface BowlerLine {
  playerId: string;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  current?: boolean;
}

export interface FallOfWicket {
  score: number;
  wicket: number;
  balls: number;
  playerId: string;
}

export interface Innings {
  teamId: string;
  batting: BatterLine[];
  bowling: BowlerLine[];
  extras: { byes: number; legByes: number; wides: number; noBalls: number };
  fow: FallOfWicket[];
  /** Runs per over, for the Manhattan chart. */
  overRuns: number[];
  overWickets: number[];
  yetToBat: string[];
}

export type BallOutcome =
  | { kind: 'runs'; runs: number }
  | { kind: 'four' }
  | { kind: 'six' }
  | { kind: 'wicket'; text: string }
  | { kind: 'extra'; label: 'wd' | 'nb' | 'lb' | 'b'; runs: number };

export interface Ball {
  id: string;
  /** "17.3" */
  over: string;
  outcome: BallOutcome;
  text: string;
  bowler: string;
  batter: string;
  /** Innings number (1-based), so overs from different innings never mix. */
  inning?: number;
}

export interface OverSummary {
  over: number;
  runs: number;
  wickets: number;
  score: string;
  bowler: string;
  balls: BallOutcome[];
}

export interface Match {
  id: string;
  slug: string;
  seriesId: string;
  title: string;
  format: Format;
  /** False when the format was inferred (no tournament from the feed). */
  formatKnown?: boolean;
  /** When the feed last changed this match (live freshness). */
  updatedAt?: string;
  status: MatchStatus;
  startTime: string;
  venueId: string;
  teamA: string;
  teamB: string;
  innings: InningsScore[];
  /** "Pakistan need 42 runs from 27 balls" / "Starts in 3h 20m". */
  statusText: string;
  toss?: string;
  result?: { winnerId?: string; text: string };
  battingTeamId?: string;
  target?: number;
  /** Live-only extras for the match header. */
  live?: {
    crr: number;
    rrr?: number;
    /** Current stand, from the ball-by-ball feed (absent on list rows). */
    partnership?: { runs: number; balls: number };
    lastWicket?: string;
    recent: BallOutcome[];
    projected?: number;
  };
  featured?: boolean;
  umpires?: string[];
  referee?: string;
  playerOfMatch?: string;
}

export interface Standing {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  noResult: number;
  points: number;
  nrr: number;
  form: ('W' | 'L' | 'N')[];
  qualified?: boolean;
}

export type NewsCategory =
  | 'Breaking'
  | 'Pakistan'
  | 'PSL'
  | 'International'
  | 'Match News'
  | 'Analysis'
  | 'Features'
  | 'Records'
  | 'Interviews'
  | 'Explainers';

export interface Author {
  id: string;
  name: string;
  role: string;
  initials: string;
}

export interface Article {
  id: string;
  slug: string;
  lang: 'en' | 'ur';
  title: string;
  summary: string;
  body: string[];
  category: NewsCategory;
  authorId: string;
  publishedAt: string;
  updatedAt?: string;
  readMinutes: number;
  breaking?: boolean;
  featured?: boolean;
  /** Entity associations from the CMS (players, teams, matches, series). */
  teamIds: string[];
  playerIds: string[];
  matchId?: string;
  seriesId?: string;
  /** Cover image URL (Cloudinary). */
  image?: Photo;
}

export interface Factor {
  label: string;
  /** Change in team A win probability, percentage points. */
  delta: number;
  detail: string;
}

export interface Prediction {
  matchId: string;
  modelVersion: string;
  generatedAt: string;
  /** Team A win probability, 0..1. */
  winA: number;
  confidence: 'Low' | 'Medium' | 'High';
  projected: { teamId: string; low: number; high: number; mid: number };
  /** Live win probability after each over (team A), 0..1. */
  history?: { over: number; p: number; event?: 'wicket' | 'six' }[];
  topBatters: { playerId: string; p: number }[];
  topBowlers: { playerId: string; p: number }[];
  venue: { label: string; value: string; tone: 'good' | 'bad' | 'neutral' }[];
  weather: { temp: number; humidity: number; wind: number; rain: number; summary: string };
  tossAdjusted?: { before: number; after: number; note: string };
  why: Factor[];
  momentum?: number;
  pressure?: number;
  inputs: string[];
  /** Plain-language summary of the stored run, from the API. */
  narrative?: string;
  outcome?: 'correct' | 'incorrect';
}

export interface ModelPerformance {
  modelVersion: string;
  since: string;
  total: number;
  correct: number;
  brier: number;
  byFormat: { format: Format; total: number; accuracy: number }[];
  bands: { band: string; predicted: number; actual: number; count: number }[];
}

export interface Comment {
  id: string;
  /** The poster's account, to tell your own comments apart. */
  userId?: string;
  author: string;
  /** Supporter badge shown next to the name. */
  teamId?: string;
  body: string;
  at: string;
  /** Reaction counts by emoji, and which of them are yours. */
  reactions: Record<string, number>;
  mine: string[];
  pinned?: boolean;
  /** Posted by the editorial team. */
  staff?: boolean;
}

/** Remote image URL (Cloudinary). */
export type Photo = string;

/** One frame of a short or gallery story. */
export interface Slide {
  headline: string;
  caption: string;
  photo?: Photo;
  teamIds: string[];
  /** Small stat line under the headline ("92m · 14.6 ov"). */
  stat?: string;
}

/** Vertical short-form highlights (reels) and photo galleries. */
export interface Short {
  id: string;
  kind: 'short' | 'gallery';
  title: string;
  teamIds: string[];
  photo?: Photo;
  slides: Slide[];
  views: number;
  publishedAt: string;
  matchId?: string;
  live?: boolean;
  /** Video file for a short (opens in the player app). */
  videoUrl?: string;
}

/** Long-form video (highlights, press conferences). */
export interface Video {
  id: string;
  title: string;
  duration: string;
  teamIds: string[];
  photo?: Photo;
  views: number;
  publishedAt: string;
  category: string;
  url?: string;
}

/** Promotional hero banner on Home, managed from the CMS. */
export interface Banner {
  id: string;
  overline: string;
  title: string;
  cta: string;
  photo?: Photo;
  teamIds: string[];
  route: { name: 'Match' | 'Psl' | 'Pakistan' | 'Article' | 'Prediction'; id?: string };
}

export interface Ranking {
  rank: number;
  id: string;
  rating: number;
  change: number;
  points?: number;
  matches?: number;
}
