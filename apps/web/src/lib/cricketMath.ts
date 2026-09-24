export function finite(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Cricket overs `10.3` means 10 overs + 3 balls (not 10.3 decimal overs). `0.6` is 1.0. */
export function oversToBalls(overs: number): number | null {
  if (!Number.isFinite(overs) || overs < 0) return null;
  const whole = Math.trunc(overs + 1e-9);
  let ballsPart = Math.round((overs - whole) * 10);
  if (ballsPart < 0) return null;
  let completed = whole;
  if (ballsPart >= 6) {
    completed += Math.floor(ballsPart / 6);
    ballsPart %= 6;
  }
  return completed * 6 + ballsPart;
}

export function formatCricketOvers(overs: unknown): string {
  if (overs === '' || overs === null || overs === undefined) return '';
  const n = Number(overs);
  const balls = Number.isFinite(n) ? oversToBalls(n) : null;
  if (balls === null || balls < 0) return '';
  const completed = Math.floor(balls / 6);
  const rem = balls % 6;
  return rem === 0 ? String(completed) : `${completed}.${rem}`;
}

export function ballsToDecimalOvers(balls: number): number | null {
  if (!Number.isFinite(balls) || balls <= 0) return null;
  return balls / 6;
}

export function cricketOvers(overs: number): number | null {
  const balls = oversToBalls(overs);
  if (balls === null || balls <= 0) return null;
  return balls / 6;
}

export function battingStrikeRate(runs: number, balls: number): number | null {
  if (balls <= 0) return null;
  return (runs / balls) * 100;
}

export function battingAverage(runs: number, dismissals: number): number | null {
  if (dismissals <= 0) return null;
  return runs / dismissals;
}

export function bowlingEconomy(runs: number, overs: number): number | null {
  const decimal = cricketOvers(overs);
  if (decimal === null) return null;
  return runs / decimal;
}

export function bowlingAverage(runs: number, wickets: number): number | null {
  if (wickets <= 0) return null;
  return runs / wickets;
}

export function currentRunRate(runs: number, overs: number): number | null {
  const decimal = cricketOvers(overs);
  if (decimal === null) return null;
  return runs / decimal;
}

export function requiredRunRate(runsNeeded: number, ballsLeft: number): number | null {
  if (ballsLeft <= 0) return null;
  return (runsNeeded / ballsLeft) * 6;
}

export function requiredRunRateFromOvers(runsNeeded: number, oversLeft: number): number | null {
  const balls = oversToBalls(oversLeft);
  if (balls === null || balls <= 0) return null;
  return (runsNeeded / balls) * 6;
}

/**
 * NRR = (runs scored / overs faced) − (runs conceded / overs bowled).
 * If a side is all out, ICC uses the full innings allocation, not balls faced.
 */
export function netRunRate(
  runsFor: number,
  oversFor: number,
  runsAgainst: number,
  oversAgainst: number,
  opts?: { allOutFor?: boolean; allOutAgainst?: boolean; scheduledOvers?: number }
): number | null {
  const scheduled = opts?.scheduledOvers;
  const forOvers =
    opts?.allOutFor && scheduled && scheduled > 0 ? cricketOvers(scheduled) : cricketOvers(oversFor);
  const againstOvers =
    opts?.allOutAgainst && scheduled && scheduled > 0
      ? cricketOvers(scheduled)
      : cricketOvers(oversAgainst);
  if (forOvers === null || againstOvers === null) return null;
  return runsFor / forOvers - runsAgainst / againstOvers;
}

export type FollowOnDays = 1 | 2 | 3 | 4 | 5;

/** Law 14 — lead required to enforce the follow-on. */
export function followOnNeeded(days: FollowOnDays): number {
  switch (days) {
    case 5:
      return 200;
    case 4:
    case 3:
      return 150;
    case 2:
      return 100;
    case 1:
      return 75;
    default: {
      const _never: never = days;
      return _never;
    }
  }
}

export function followOnLead(
  firstInnings: number,
  trailScore: number,
  days: FollowOnDays
): {
  lead: number;
  needed: number;
  enforced: boolean;
} {
  const needed = followOnNeeded(days);
  const lead = firstInnings - trailScore;
  return { lead, needed, enforced: lead >= needed };
}

export function formatRate(value: number | null, digits = 2): string {
  if (value === null) return '—';
  return value.toFixed(digits);
}
