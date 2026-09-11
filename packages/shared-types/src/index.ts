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

export interface CanonicalMatch {
  matchId: string;
  status: MatchStatus;
  teams: string[];
  teamNames: string[];
  tournament: string | null;
  venue: string | null;
  scheduled: string | null;
  currentInnings: CurrentInnings | null;
  lastEvent: LastEvent;
  displayScore: string | null;
  matchStatus: string | null;
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
