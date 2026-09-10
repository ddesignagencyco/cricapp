/* ─── API Response Types ──────────────────────────────────── */

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

/* ─── Team ────────────────────────────────────────────────── */

export interface TeamColors {
  primary: string;
  secondary: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  city: string;
  colors: TeamColors;
  logo?: string;
  abbr?: string;
  country?: string;
  [key: string]: unknown;
}

/* ─── Player ──────────────────────────────────────────────── */

export interface PlayerTeam {
  id: string;
  name: string;
  abbr: string;
  country?: string;
  logoUrl?: string;
}

export interface Player {
  id: string;
  name: string;
  fullName?: string;
  shortName?: string;
  teamId: string;
  teamName: string;
  country: string;
  nationality?: string;
  role: string;
  battingStyle?: string;
  bowlingStyle?: string;
  birth?: string;
  profileUrl?: string;
  team?: PlayerTeam;
  recentMatches?: Match[];
  [key: string]: unknown;
}

/* ─── Match Scorecard ─────────────────────────────────────── */

export interface BattingRow {
  id?: string;
  name: string;
  out?: boolean;
  runs: number | string;
  balls: number | string;
  fours: number | string;
  sixes: number | string;
  sr: number | string;
  [key: string]: unknown;
}

export interface BowlingRow {
  id?: string;
  name: string;
  overs: number | string;
  maidens: number | string;
  runs: number | string;
  wickets: number | string;
  econ: number | string;
  [key: string]: unknown;
}

export interface LiveBatsman {
  name: string;
  runs: number | string;
  balls: number | string;
  status: string;
  sr?: number | string;
  [key: string]: unknown;
}

export interface LiveBowler {
  name: string;
  overs: number | string;
  maidens: number | string;
  runs: number | string;
  wickets: number | string;
  econ?: number | string;
  [key: string]: unknown;
}

export interface CurrentInnings {
  battingTeam: string;
  runs: number;
  wickets: number;
  overs: number;
  runRate: number;
  [key: string]: unknown;
}

export interface FallOfWicket {
  wicket: number;
  runs: number;
  overs: number;
  batter?: string;
  [key: string]: unknown;
}

export interface Partnership {
  batsman1: string;
  batsman2: string;
  runs: number;
  balls: number;
  [key: string]: unknown;
}

export interface OverSummary {
  over: number;
  runs: number;
  wickets: number;
  balls?: string[];
  [key: string]: unknown;
}

export interface MatchEvent {
  type?: string;
  description?: string;
  [key: string]: unknown;
}

/* ─── Match ───────────────────────────────────────────────── */

export interface MatchTeamSide {
  teamId: string;
  name: string;
  code: string;
  score: string;
  overs: string;
}

export interface MatchTeams {
  home?: MatchTeamSide;
  away?: MatchTeamSide;
  [key: string]: unknown;
}

export interface Match {
  id?: string;
  matchId?: string;
  tournamentId?: string | null;
  tournamentName?: string;
  tournament?: string;
  matchNumber?: number | null;
  matchStatus?: string;
  group?: string;
  status: string;
  venue?: string;
  city?: string;
  date?: string;
  time?: string;
  scheduled?: string;
  teams?: MatchTeams;
  teamNames?: string[];
  home?: MatchTeamSide;
  away?: MatchTeamSide;
  toss?: string;
  result?: string;
  currentRunRate?: number | null;
  requiredRunRate?: number | null;
  target?: number;
  partnership?: { runs: number; balls: number };
  bowler?: LiveBowler;
  batsmen?: LiveBatsman[];
  battingScorecard?: BattingRow[];
  bowlingScorecard?: BowlingRow[];
  fallOfWickets?: FallOfWicket[];
  partnerships?: Partnership[];
  overSummary?: OverSummary[];
  recentBalls?: string[];
  currentInnings?: CurrentInnings;
  displayScore?: string;
  lastEvent?: MatchEvent;
  [key: string]: unknown;
}

/* ─── News ────────────────────────────────────────────────── */

export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  type: string;
  date: string;
  tag?: string;
  tags?: string[];
  author: string;
  readTime: string;
  excerpt: string;
  content: string;
  image?: string;
  imageGradient?: string;
  relatedTeams?: string[];
  [key: string]: unknown;
}

/* ─── Streams ─────────────────────────────────────────────── */

export interface ChatMessage {
  user: string;
  text: string;
  time: string;
}

export interface Stream {
  id: string;
  title: string;
  shortTitle?: string;
  status: string;
  matchId?: string;
  embedType?: string;
  embedId?: string;
  embedUrl?: string;
  image?: string;
  theme?: string;
  language?: string;
  quality?: string;
  host?: string;
  coHost?: string;
  viewers?: number;
  chatSample?: ChatMessage[];
  startedAt?: string;
  tags?: string[];
  description?: string;
  [key: string]: unknown;
}

/* ─── Tournaments ─────────────────────────────────────────── */

export interface Tournament {
  id: string;
  name: string;
  shortName: string;
  code: string;
  format?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  matchesPlayed?: number;
  totalMatches?: number;
  teams: string[];
  [key: string]: unknown;
}

export interface TournamentApi {
  id: string;
  name: string;
  type?: string;
  gender?: string;
  category?: string;
  currentSeason?: TournamentSeason;
  sport?: string;
  tourId?: string;
  parentId?: string;
  [key: string]: unknown;
}

export interface TournamentSeason {
  id: string;
  tournamentId: string;
  name?: string;
  year?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

/* ─── Points Table ────────────────────────────────────────── */

export interface PointsRow {
  rank?: number;
  teamId: string;
  teamName: string;
  teamAbbr: string;
  played: number;
  won: number;
  lost: number;
  tied?: number;
  noResult?: number;
  points: number;
  netRunRate: number;
}

/* ─── Leaders ─────────────────────────────────────────────── */

export interface LeaderEntry {
  rank?: number;
  playerId: string;
  playerName: string;
  teamAbbr: string;
  teamName: string;
  value: number | string;
}

export interface LeaderGroup {
  category: string;
  stat: string;
  entries: LeaderEntry[];
}

/* ─── Search ──────────────────────────────────────────────── */

export interface SearchResults {
  players: Player[];
  teams: Team[];
  matches: Match[];
  tournaments: TournamentApi[];
}

/* ─── PSL ─────────────────────────────────────────────────── */

export interface PslSeason {
  id: string;
  name: string;
  year: string;
}

export interface PslSchedule {
  matchId: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeTeamName?: string;
  awayTeamName?: string;
  scheduled: string;
  status: string;
  venue?: string;
  round?: string;
}

export interface PslSquad {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  players: Player[];
}

/* ─── Tours ───────────────────────────────────────────────── */

export interface Tour {
  id: string;
  name: string;
  category?: string | { id?: string; name?: string; country_code?: string };
  sport?: string | { id?: string; name?: string };
  [key: string]: unknown;
}

/* ─── Schedule / Events ───────────────────────────────────── */

export interface SportEventRecord {
  kind: string;
  scopeKey: string;
  eventId: string;
  status?: string;
  scheduled?: string;
  payload: Record<string, unknown>;
  [key: string]: unknown;
}

/* ─── Head to Head ────────────────────────────────────────── */

export interface HeadToHead {
  teamAId: string;
  teamBId: string;
  payload: Record<string, unknown>;
  [key: string]: unknown;
}

/* ─── UI Types ────────────────────────────────────────────── */

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  count?: number;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
}
