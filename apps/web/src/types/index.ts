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
  [key: string]: any;
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
  team?: {
    id: string;
    name: string;
    abbr: string;
    country?: string;
    logoUrl?: string;
  };
  recentMatches?: MatchSummary[];
  [key: string]: any;
}

export interface BattingRow {
  id?: string;
  name: string;
  out?: boolean;
  runs: number | string;
  balls: number | string;
  fours: number | string;
  sixes: number | string;
  sr: number | string;
  [key: string]: any;
}

export interface BowlingRow {
  id?: string;
  name: string;
  overs: number | string;
  maidens: number | string;
  runs: number | string;
  wickets: number | string;
  econ: number | string;
  [key: string]: any;
}

export interface Batsman {
  name: string;
  runs: number | string;
  balls: number | string;
  status: string;
  sr?: number | string;
  [key: string]: any;
}

export interface Bowler {
  name: string;
  overs: number | string;
  maidens: number | string;
  runs: number | string;
  wickets: number | string;
  econ?: number | string;
  [key: string]: any;
}

export interface CurrentInnings {
  battingTeam: string;
  runs: number;
  wickets: number;
  overs: number;
  runRate: number;
  [key: string]: any;
}

export interface MatchTeamSide {
  teamId: string;
  name: string;
  code: string;
  score: string;
  overs: string;
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
  teams?: any;
  teamNames?: string[];
  home?: MatchTeamSide;
  away?: MatchTeamSide;
  toss?: string;
  result?: string;
  currentRunRate?: number | null;
  requiredRunRate?: number | null;
  target?: number;
  partnership?: { runs: number; balls: number };
  bowler?: Bowler;
  batsmen?: Batsman[];
  battingScorecard?: BattingRow[];
  bowlingScorecard?: BowlingRow[];
  fallOfWickets?: any[];
  partnerships?: any[];
  overSummary?: any[];
  recentBalls?: string[];
  currentInnings?: CurrentInnings;
  displayScore?: string;
  lastEvent?: any;
  [key: string]: any;
}

export type MatchSummary = Match;

export interface NewsArticle {
  id: string;
  title: string;
  category: string;
  type: string;
  date: string;
  tag?: string;
  author: string;
  readTime: string;
  excerpt: string;
  content: string;
  image?: string;
  imageGradient?: string;
  relatedTeams?: string[];
  [key: string]: any;
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
  [key: string]: any;
}

export interface ChatMessage {
  user: string;
  text: string;
  time: string;
}

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
  [key: string]: any;
}

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

export interface SearchResults {
  players: Player[];
  teams: Team[];
  matches: MatchSummary[];
  tournaments: Tournament[];
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
