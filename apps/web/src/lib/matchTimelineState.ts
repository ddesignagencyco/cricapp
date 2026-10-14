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

/**
 * Splice a `?since=` delta onto the timeline already held.
 *
 * The API answers a delta with the *whole envelope* — `sport_event_status`, squads,
 * competitors and every other block — but with `sport_event_timeline.timeline`
 * truncated to only the events after `since`. So the merge is asymmetric on purpose:
 * the event list is appended to what we already had, while every other block is taken
 * from the delta because it is a fresh full snapshot rather than a fragment.
 *
 * Events are keyed by `id` where they carry one. The provider rewrites the tail of the
 * timeline on every sync, so a ball that was already delivered can come back inside the
 * delta; concatenating blindly would render it twice in the commentary list.
 */
export function mergeTimelineDelta<T extends { payload: Record<string, unknown>; complete?: boolean }>(
  base: T | null | undefined,
  delta: T,
): T {
  if (!base || delta.complete !== false) return delta;

  const baseTimeline = timelineEventsOf(base.payload);
  const deltaTimeline = timelineEventsOf(delta.payload);
  if (!baseTimeline) return delta;
  if (!deltaTimeline || deltaTimeline.length === 0) return { ...base, ...delta, payload: base.payload };

  const seen = new Set<string>();
  const merged: unknown[] = [];
  for (const event of [...baseTimeline, ...deltaTimeline]) {
    const key = isRecord(event) && typeof event.id === 'number' ? `id:${event.id}` : null;
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    merged.push(event);
  }

  return { ...base, ...delta, payload: replaceTimelineEvents(delta.payload, merged) };
}

/** The event list, whichever of the two wrappers this payload uses. */
function timelineEventsOf(payload: Record<string, unknown> | null | undefined): unknown[] | null {
  const inner = innerPayload(payload);
  if (!inner) return null;
  const direct = inner.timeline;
  if (Array.isArray(direct)) return direct;
  const wrapper = inner.sport_event_timeline;
  if (isRecord(wrapper) && Array.isArray(wrapper.timeline)) return wrapper.timeline;
  if (Array.isArray(inner.sport_event_timeline)) return inner.sport_event_timeline;
  return null;
}

/**
 * Write `events` back at whichever depth the list was found, leaving the rest of the
 * payload — and its shape — untouched.
 *
 * Recurses into the `{ payload: { … } }` envelope, which is exactly what
 * `GET /matches/:id/timeline` returns, so the same helper serves both the stored row
 * and the API response without either knowing which one it got.
 */
function replaceTimelineEvents(
  payload: Record<string, unknown>,
  events: unknown[],
): Record<string, unknown> {
  const nested = payload.payload;
  if (isRecord(nested)) {
    return { ...payload, payload: replaceTimelineEvents(nested, events) };
  }
  const wrapper = payload.sport_event_timeline;
  if (isRecord(wrapper)) {
    return { ...payload, sport_event_timeline: { ...wrapper, timeline: events } };
  }
  return { ...payload, timeline: events };
}