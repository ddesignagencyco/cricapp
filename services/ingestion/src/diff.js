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

/**
 * True when score, overs, status or last-ball changed.
 * Thin diff events miss overs-only updates; the socket snapshot uses this.
 */
export function hasMatchChanged(previous, next) {
  if (!previous) return true;
  if (previous.status !== next.status) return true;
  if ((previous.displayScore || "") !== (next.displayScore || "")) return true;
  if ((previous.matchStatus || "") !== (next.matchStatus || "")) return true;
  if (inningsKey(previous.currentInnings) !== inningsKey(next.currentInnings)) return true;
  if (lastEventKey(previous.lastEvent) !== lastEventKey(next.lastEvent)) return true;
  return false;
}

function oversToBalls(overs) {
  if (overs == null || !Number.isFinite(Number(overs))) return null;
  const n = Number(overs);
  if (n < 0) return null;
  const whole = Math.floor(n);
  const balls = Math.round((n - whole) * 10);
  return whole * 6 + Math.min(balls, 5);
}

function extractInningNumber(match) {
  const n = match?.currentInning;
  if (n != null && Number.isFinite(Number(n)) && Number(n) > 0) return Number(n);
  if (Array.isArray(match?.periodScores) && match.periodScores.length > 0) {
    return match.periodScores.length;
  }
  return null;
}

function extractRuns(match) {
  const innRuns = match?.currentInnings?.runs;
  if (innRuns != null && Number.isFinite(Number(innRuns))) return Number(innRuns);
  const m = String(match?.displayScore ?? "").match(/(\d+)\s*\/\s*\d+\s*$/);
  return m ? Number(m[1]) : null;
}

/**
 * True when `next` is provably older than `previous` for an in-play match.
 *
 * Upstream RapidAPI / Cricbuzz edge caches occasionally serve a response from
 * an earlier over (e.g. 80/2 after we already persisted 112/3). Writing that
 * back into Postgres + Redis makes the score jump backwards on page refresh.
 *
 * Only guards live → live (and completed → live) transitions; a match moving
 * from live → completed always wins so final results are never blocked.
 */
export function isLiveSnapshotBehind(previous, next) {
  if (!previous || !next) return false;
  if (
    (previous.status === MATCH_STATUS.COMPLETED || previous.status === MATCH_STATUS.CANCELLED) &&
    next.status === MATCH_STATUS.LIVE
  ) {
    return true;
  }
  if (previous.status !== MATCH_STATUS.LIVE || next.status !== MATCH_STATUS.LIVE) {
    return false;
  }

  const prevInning = extractInningNumber(previous);
  const nextInning = extractInningNumber(next);
  if (prevInning != null && nextInning != null) {
    if (nextInning < prevInning) return true;
    if (nextInning > prevInning) return false;
  }

  // If batting team changed without an explicit inning number, treat it as a new innings.
  const prevBat = previous.currentInnings?.battingTeam;
  const nextBat = next.currentInnings?.battingTeam;
  if (prevInning == null && nextInning == null && prevBat && nextBat && prevBat !== nextBat) {
    return false;
  }

  const prevBalls = oversToBalls(previous.displayOvers ?? previous.currentInnings?.overs);
  const nextBalls = oversToBalls(next.displayOvers ?? next.currentInnings?.overs);
  if (prevBalls != null && nextBalls != null) {
    if (nextBalls < prevBalls) return true;
    if (nextBalls > prevBalls) return false;
  }

  const prevRuns = extractRuns(previous);
  const nextRuns = extractRuns(next);
  if (prevRuns != null && nextRuns != null && nextRuns < prevRuns) {
    return true;
  }

  return false;
}
