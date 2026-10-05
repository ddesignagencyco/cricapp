import { isFurtherAlong } from './cricketMath';

/**
 * Reading the latest state out of a Sportradar ball-by-ball payload.
 *
 * The timeline and the match row are written by different paths, so either can be a
 * ball or two ahead of the other. Every comparison between them has to go through
 * balls rather than the raw numbers — `29` and `28.6` are the same 174 balls.
 */

export type TimelineInningsState = {
  /** Runs at that point in the innings. */
  runs: number | null;
  /** Overs in cricket notation, e.g. `30.6` meaning 30 overs and 6 balls. */
  overs: number | null;
  /**
   * The provider's own overs string, e.g. `"30.6"`. Preferred for display: passing it
   * through keeps the scorecard in step with the commentary, which prints this exact
   * value. Re-formatting the number instead would print "31" beside a "30.6".
   */
  oversLabel: string | null;
  /** `113/6`, as the payload renders it. */
  score: string | null;
  /** `time` of the event, when present. Used only for display. */
  time: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The inner payload, whatever wrapper the endpoint used.
 *
 * ## Why this exists
 *
 * Every other reader of a timeline payload (`matchInnings.ts` → `unwrapTimelinePayload`,
 * `statusBlockOf`, `MatchTimeline.tsx`) copes with the three nestings the provider and
 * the API use: a bare object, `{ payload: { … } }`, and `{ sport_event_timeline: { … } }`.
 *
 * This module read `payload.sport_event_status` and `payload.timeline` **directly**. When
 * the payload arrived wrapped — which is exactly what `GET /matches/:id/timeline`
 * returns — both lookups missed, `timelineInningsState` returned `null`, and the
 * timeline silently contributed nothing to the score. `deriveMatchState` then fell back
 * to the match row, which is written by a different path and lags: the header sat at
 * `58/1 (4.2 ov)` while the commentary directly beneath it, parsed by a module that
 * *does* unwrap, showed `63/1 (5.3)`.
 *
 * Same match, same page, two answers — purely because two readers disagreed about the
 * envelope. Unwrapping here makes the timeline count again, which is what lets it win
 * the "furthest along in balls" comparison it was written for.
 */
function innerPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  const direct = payload.sport_event_status ?? payload.timeline ?? payload.sport_event_timeline;
  if (direct !== undefined) return payload;

  const nested = payload.payload;
  if (isRecord(nested)) return innerPayload(nested);

  const wrapper = payload.sport_event_timeline;
  if (isRecord(wrapper)) return innerPayload(wrapper);

  return payload;
}

/** The `sport_event_status` block, which carries the payload's own running totals. */
function statusOf(payload: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  const inner = innerPayload(payload);
  if (!inner) return null;
  const direct = inner.sport_event_status;
  if (isRecord(direct)) return direct;
  const wrapper = inner.sport_event_timeline;
  if (isRecord(wrapper) && isRecord(wrapper.sport_event_status)) return wrapper.sport_event_status;
  return null;
}

function parseScoreRuns(score: unknown): number | null {
  if (score === null || score === undefined) return null;
  const match = String(score).match(/(\d+)\s*[/\-]/);
  const n = match ? Number(match[1]) : Number(String(score));
  return Number.isFinite(n) ? n : null;
}

function toNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** The last ball event in the payload, in payload order. */
export function lastTimelineBall(payload: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  const inner = innerPayload(payload);
  if (!inner) return null;
  // Same three shapes as the status block: bare, `sport_event_timeline.timeline`, or the
  // event list sitting directly on the payload.
  const direct = inner.timeline;
  const wrapper = inner.sport_event_timeline;
  const nested = isRecord(wrapper) ? wrapper.timeline : undefined;
  const timeline = Array.isArray(direct)
    ? direct
    : Array.isArray(nested)
      ? nested
      : Array.isArray(inner.sport_event_timeline)
        ? inner.sport_event_timeline
        : null;
  if (!timeline || timeline.length === 0) return null;
  for (let i = timeline.length - 1; i >= 0; i -= 1) {
    const event = timeline[i];
    if (isRecord(event) && event.type === 'ball') return event;
  }
  return null;
}

/**
 * The furthest-along innings state the timeline knows about, preferring the status
 * block when it is ahead of the last ball.
 */
export function timelineInningsState(payload: Record<string, unknown> | null | undefined): TimelineInningsState {
  const status = statusOf(payload);
  const last = lastTimelineBall(payload);

  const statusOvers = toNumber(status?.display_overs);
  const ballOvers = toNumber(last?.display_overs);
  const timelineIsAhead = isFurtherAlong(ballOvers, statusOvers);
  const overs = timelineIsAhead ? ballOvers : statusOvers;
  const oversLabel = String(
    (timelineIsAhead ? last?.display_overs : status?.display_overs) ?? '',
  ).trim();

  const statusScore =
    status?.display_score !== undefined && status?.display_score !== null
      ? String(status.display_score)
      : null;
  const ballScore =
    last?.display_score !== undefined && last?.display_score !== null
      ? String(last.display_score)
      : null;
  const score = timelineIsAhead ? ballScore : statusScore;

  // Runs have to come from whichever source won, otherwise the score and the run count
  // disagree — which is exactly what a stale status block alongside a fresher last ball
  // produces.
  const runs = parseScoreRuns(score);

  return {
    runs,
    overs,
    oversLabel: oversLabel || null,
    score: score || (runs !== null ? String(runs) : null),
    time: typeof last?.time === 'string' ? last.time : null,
  };
}