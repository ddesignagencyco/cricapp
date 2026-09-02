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

export {
  PROVIDERS,
  MATCH_STATUS,
  EVENT_TYPES,
  PSL,
  PSL_SEASONS,
  PSL_LEADER_CATEGORIES,
} from "./schema.js";

export { redisKeys, REDIS_TTL } from "./redis.js";
