import { sportEventStatusFromPayload } from '../common/sport-event-status.util.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseOvers(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function normalizeScore(score: string | null | undefined): string {
  return (score ?? '').replace(/\s/g, '').toLowerCase();
}

function timelineStatusFromPayload(payload: Record<string, unknown>) {
  const direct = sportEventStatusFromPayload(payload);
  if (direct?.displayScore != null || direct?.displayOvers != null) return direct;

  const wrapper = asRecord(payload.sport_event_timeline);
  if (!wrapper) return direct;

  return (
    sportEventStatusFromPayload({
      sport_event_status: wrapper.sport_event_status,
    }) ?? direct
  );
}

function lastTimelineEvent(payload: Record<string, unknown>): Record<string, unknown> | null {
  const wrapper = asRecord(payload.sport_event_timeline);
  const timeline = wrapper?.timeline ?? payload.timeline;
  if (!Array.isArray(timeline) || timeline.length === 0) return null;
  return asRecord(timeline[timeline.length - 1]);
}

export interface LiveTimelineMatchView {
  status: string;
  displayScore: string | null;
  displayOvers: number | null;
}

/**
 * True when a live match summary is ahead of the stored Sportradar timeline payload.
 */
export function isLiveTimelineBehindMatch(
  match: LiveTimelineMatchView,
  timelinePayload: Record<string, unknown>,
): boolean {
  if (match.status !== 'live') return false;

  const timelineStatus = timelineStatusFromPayload(timelinePayload);
  const lastEvent = lastTimelineEvent(timelinePayload);

  const matchOvers = match.displayOvers;
  const timelineOvers =
    timelineStatus?.displayOvers ??
    parseOvers(lastEvent?.display_overs) ??
    parseOvers(lastEvent?.displayOvers);

  if (matchOvers != null && timelineOvers != null && matchOvers > timelineOvers + 0.05) {
    return true;
  }

  const matchScore = match.displayScore;
  const timelineScore =
    timelineStatus?.displayScore ??
    (lastEvent?.display_score != null ? String(lastEvent.display_score) : null);

  if (
    matchScore &&
    timelineScore &&
    normalizeScore(matchScore) !== normalizeScore(timelineScore)
  ) {
    return true;
  }

  return false;
}
