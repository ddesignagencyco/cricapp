import { EVENT_TYPES, MATCH_STATUS } from "@cricapp/shared-types";

const MILESTONE_MARKS = [50, 100, 150, 200, 250, 300];

function lastEventKey(event) {
  if (!event) return "";
  return `${event.type}:${event.runs}:${event.over}`;
}

function inningsKey(innings) {
  if (!innings) return "";
  return `${innings.battingTeam}:${innings.runs}:${innings.wickets}:${innings.overs}`;
}

/**
 * Compare two CanonicalMatch snapshots and emit MatchEvent objects.
 * @param {import('@cricapp/shared-types').CanonicalMatch | null} previous
 * @param {import('@cricapp/shared-types').CanonicalMatch} next
 * @returns {import('@cricapp/shared-types').MatchEvent[]}
 */
export function diffMatch(previous, next) {
  const matchId = next.matchId;
  const events = [];

  if (!previous) {
    if (next.status === MATCH_STATUS.LIVE) {
      events.push({ type: EVENT_TYPES.MATCH_STARTED, matchId });
    }
    return events;
  }

  if (previous.status !== next.status) {
    if (
      previous.status === MATCH_STATUS.UPCOMING &&
      next.status === MATCH_STATUS.LIVE
    ) {
      events.push({ type: EVENT_TYPES.MATCH_STARTED, matchId });
    }
    events.push({
      type: EVENT_TYPES.STATUS_CHANGE,
      matchId,
    });
  }

  const prevInn = previous.currentInnings;
  const nextInn = next.currentInnings;

  if (inningsKey(prevInn) !== inningsKey(nextInn) && nextInn) {
    if (prevInn && nextInn.wickets > prevInn.wickets) {
      events.push({ type: EVENT_TYPES.WICKET, matchId });
    } else if (prevInn && nextInn.runs > prevInn.runs) {
      events.push({ type: EVENT_TYPES.RUNS, matchId });
    }

    const prevRuns = prevInn?.runs ?? 0;
    for (const mark of MILESTONE_MARKS) {
      if (prevRuns < mark && nextInn.runs >= mark) {
        events.push({ type: EVENT_TYPES.MILESTONE, matchId });
      }
    }
  }

  if (
    lastEventKey(previous.lastEvent) !== lastEventKey(next.lastEvent) &&
    next.lastEvent?.type !== "none"
  ) {
    const already =
      (next.lastEvent.type === "runs" && events.some((e) => e.type === EVENT_TYPES.RUNS)) ||
      (next.lastEvent.type === "wicket" && events.some((e) => e.type === EVENT_TYPES.WICKET));
    if (!already) {
      events.push({
        type: next.lastEvent.type === "wicket" ? EVENT_TYPES.WICKET : EVENT_TYPES.RUNS,
        matchId,
      });
    }
  }

  return events;
}
