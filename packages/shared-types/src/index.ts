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
  code: string;
  name: string;
  score: string;
  overs: string;
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
  venue: string | null;
  scheduled: string | null;
  currentInnings: CurrentInnings | null;
  lastEvent: LastEvent;
  displayScore: string | null;
  matchStatus: string | null;
  /** Official result line, e.g. "India won by 147 runs". */
  result?: string | null;
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

export { redisKeys, REDIS_TTL } from "./redis.js";
