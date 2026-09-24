import { apiPost } from './api/client';

export type AssistantIntent =
  | 'team_head_to_head'
  | 'match_prediction_summary'
  | 'live_win_prob_explain'
  | 'player_compare'
  | 'player_recent_form'
  | 'standings_qualification'
  | 'unknown';

export type AssistantSourceType =
  | 'prediction_run'
  | 'head_to_head'
  | 'match'
  | 'team'
  | 'player'
  | 'psl_standings';

export interface AssistantSource {
  type: AssistantSourceType;
  id?: string;
  matchId?: string;
  teamAId?: string;
  teamBId?: string;
  createdAt?: string;
  modelVersion?: string;
  stage?: string;
}

export interface AssistantUnavailable {
  field: string;
  reason: string;
}

export interface AssistantAskResponse {
  intent: AssistantIntent;
  sessionId?: string;
  question?: string;
  answerText: string;
  verified: Record<string, unknown>;
  sources: AssistantSource[];
  unavailable: AssistantUnavailable[];
  followUpPrompts?: string[];
  llmNarrative: boolean;
}

export type AssistantAskBody = {
  question: string;
  sessionId?: string;
  intent?: AssistantIntent;
  matchId?: string;
  teamAId?: string;
  teamBId?: string;
  playerId?: string;
  playerAId?: string;
  playerBId?: string;
  season?: string;
  teamId?: string;
};

export function askAssistant(body: AssistantAskBody): Promise<AssistantAskResponse> {
  return apiPost<AssistantAskResponse>('/assistant/ask', body);
}
