/** SRS §11 — Cricket AI Assistant intents (expand as handlers ship). */
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

export interface AssistantAnswer {
  intent: AssistantIntent;
  sessionId?: string;
  /** Echo of the user question (for chat UI threads). */
  question?: string;
  /** Natural language; templated when LLM is disabled. */
  answerText: string;
  verified: Record<string, unknown>;
  sources: AssistantSource[];
  unavailable: AssistantUnavailable[];
  /** Short suggested next questions for a conversational UI. */
  followUpPrompts?: string[];
}
