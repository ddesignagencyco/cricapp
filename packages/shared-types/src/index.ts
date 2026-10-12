export type MatchStatus = "upcoming" | "live" | "completed";
export type LastEventType = "runs" | "wicket" | "none";

export interface CurrentInnings {
  battingTeam: string;
  runs: number;
  wickets: number;
  overs: number;
  runRate: number;
}

export interface LastEvent {
  type: LastEventType;
  runs: number;
  over: number;
}

export interface TeamSideScore {
  /** Provider competitor id, e.g. "sr:competitor:951737". Used for /teams/:id links. */
  id?: string;
  code: string;
  name: string;
  score: string;
  /** Display-only overs, as the provider renders it (e.g. "10.1"). */
  overs: string;
  /** Numeric overs for arithmetic (e.g. 10.1). Null when unknown. */
  oversBalls?: number | null;
}

export interface TeamScores {
  home: TeamSideScore;
  away: TeamSideScore;
}

export type MatchTeams =
  | string[]
  | {
      home: TeamSideScore;
      away: TeamSideScore;
    };

export interface CanonicalMatch {
  matchId: string;
  status: MatchStatus;
  teams: MatchTeams;
  teamNames: string[];
  teamScores?: TeamScores | null;
  tournament: string | null;
  /** Provider tournament id, e.g. "sr:tournament:1234". Used for /tournaments/:id links. */
  tournamentId?: string | null;
  venue: string | null;
  scheduled: string | null;
  currentInnings: CurrentInnings | null;
  lastEvent: LastEvent;
  displayScore: string | null;
  matchStatus: string | null;
  /** Official result line, e.g. "India won by 147 runs". */
  result?: string | null;
  winnerId?: string | null;
  tossWonBy?: string | null;
  tossDecision?: string | null;
  currentInning?: number | null;
  periodScores?: unknown[] | null;
  displayOvers?: number | null;
  /** Monotonic per-match revision derived from the timeline (max ball sequence). */
  revision?: number | null;
  /** ISO-8601 time the canonical snapshot this revision was computed at. */
  updatedAt?: string | null;
}

export interface MatchEvent {
  type: string;
  matchId: string;
}

export type PredictionStage = "pre_match" | "live";

export interface PredictionSnapshot {
  matchId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeName: string | null;
  awayName: string | null;
  venue: string | null;
  tournament: string | null;
  scheduled: string | null;
  format: "t20" | "odi" | "test" | "unknown";
}

export interface PredictionScore {
  homeWinProb: number;
  awayWinProb: number;
  confidence: number;
  calibrationBand: "low" | "medium" | "high";
  scoreRange?: {
    type: string;
    low: number;
    expected: number;
    high: number;
    unit: "runs";
  };
  topBatters?: Array<{ playerId: string; playerName: string; probability: number }>;
  topBowlers?: Array<{ playerId: string; playerName: string; probability: number }>;
  xi?: Record<string, unknown>;
  momentum?: number;
  pressureIndex?: number;
  partnershipProjection?: Record<string, unknown>;
  wicketRisk?: number;
  explanation: Record<string, unknown>;
}

export {
  PROVIDERS,
  MATCH_STATUS,
  EVENT_TYPES,
  PSL,
  PSL_SEASONS,
  PSL_LEADER_CATEGORIES,
  PREDICTION_STAGE,
  PREDICTION_MODELS,
} from "./schema.js";

export { ODDS_LICENSE_STATUS, ODDS_MARKET_TYPE, ODDS_SELECTION } from "./schema.constants.js";

export type OddsFormat = "decimal" | "fractional" | "american";

export {
  impliedProbabilityFromDecimal,
  bookmakerMarginFromDecimals,
  percentOddsMovement,
  decimalToFractional,
  fractionalToDecimal,
  americanToDecimal,
  decimalToAmerican,
  formatOddsFromDecimal,
  parseOddsToDecimal,
} from "./odds.math.js";

export { redisKeys, REDIS_TTL } from "./redis.js";

export {
  timelineEntriesOf,
  timelineRevision,
  timelineEventsSince,
  timelineIsSequenced,
  reconcileTimelineStatus,
} from "./revision.js";

export type {
  AssistantIntent,
  AssistantSource,
  AssistantSourceType,
  AssistantUnavailable,
  AssistantAnswer,
} from "./assistant.js";
