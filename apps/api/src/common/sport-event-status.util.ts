/** Extract Sportradar `sport_event_status` fields from stored result/schedule payloads. */

export interface SportEventStatusView {
  winnerId: string | null;
  tossWonBy: string | null;
  tossDecision: string | null;
  currentInning: number | null;
  displayScore: string | null;
  displayOvers: number | null;
  matchResultText: string | null;
  matchStatus: string | null;
  status: string | null;
  periodScores: Array<Record<string, unknown>> | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
}

export function sportEventStatusFromPayload(
  payload: Record<string, unknown> | null | undefined,
): SportEventStatusView | null {
  if (!payload) return null;
  const event = asRecord(payload.sport_event) ?? payload;
  const status =
    asRecord(payload.sport_event_status) ?? asRecord(event.sport_event_status) ?? null;
  if (!status) return null;

  const periodRaw = status.period_scores;
  const periodScores = Array.isArray(periodRaw)
    ? periodRaw.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    : null;

  return {
    winnerId: status.winner_id != null ? String(status.winner_id) : null,
    tossWonBy: status.toss_won_by != null ? String(status.toss_won_by) : null,
    tossDecision: status.toss_decision != null ? String(status.toss_decision) : null,
    currentInning: num(status.current_inning),
    displayScore: status.display_score != null ? String(status.display_score) : null,
    displayOvers: num(status.display_overs),
    matchResultText:
      status.match_result_text != null
        ? String(status.match_result_text)
        : typeof status.result === 'string'
          ? status.result
          : null,
    matchStatus: status.match_status != null ? String(status.match_status) : null,
    status: status.status != null ? String(status.status) : null,
    periodScores,
  };
}

export function sportEventFromPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!payload) return null;
  return asRecord(payload.sport_event) ?? null;
}
