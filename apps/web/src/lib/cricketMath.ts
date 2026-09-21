export function finite(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
  if (overs <= 0) return null;
  return runs / overs;
}

export function bowlingAverage(runs: number, wickets: number): number | null {
  if (wickets <= 0) return null;
  return runs / wickets;
}

export function currentRunRate(runs: number, overs: number): number | null {
  if (overs <= 0) return null;
  return runs / overs;
}

export function requiredRunRate(runsNeeded: number, ballsLeft: number): number | null {
  if (ballsLeft <= 0) return null;
  return (runsNeeded / ballsLeft) * 6;
}

export function netRunRate(
  runsFor: number,
  oversFor: number,
  runsAgainst: number,
  oversAgainst: number
): number | null {
  if (oversFor <= 0 || oversAgainst <= 0) return null;
  return runsFor / oversFor - runsAgainst / oversAgainst;
}

export function followOnLead(firstInnings: number, trailScore: number, days: 4 | 5): {
  lead: number;
  needed: number;
  enforced: boolean;
} {
  const needed = days === 5 ? 200 : 150;
  const lead = firstInnings - trailScore;
  return { lead, needed, enforced: lead >= needed };
}

export function formatRate(value: number | null, digits = 2): string {
  if (value === null) return '—';
  return value.toFixed(digits);
}
