import { cricketOvers } from './cricketMath';

function wicketFactor(wickets: number): number {
  return Math.max(0.28, 1 - Math.max(0, wickets) * 0.07);
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-a * a);
  return sign * y;
}

function normalCdf(x: number, mean: number, sd: number): number {
  if (sd <= 0) return x >= mean ? 1 : 0;
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

export function projectedInnings(args: {
  currentRuns: number;
  oversFaced?: number;
  oversLeft: number;
  wickets: number;
  assumedRpo: number;
}): { remaining: number; projected: number; low: number; high: number } | null {
  const left = cricketOvers(args.oversLeft);
  if (left === null && args.oversLeft !== 0) return null;
  const oversLeft = left ?? 0;
  const remaining = args.assumedRpo * oversLeft * wicketFactor(args.wickets);
  const projected = args.currentRuns + remaining;
  const sd = 6 * Math.sqrt(Math.max(oversLeft, 0.25));
  return {
    remaining,
    projected,
    low: Math.max(args.currentRuns, projected - 1.5 * sd),
    high: projected + 1.5 * sd,
  };
}

export function chaseChance(projected: number, target: number, oversLeft: number): number | null {
  const left = cricketOvers(oversLeft);
  if (left === null) return null;
  const sd = 6 * Math.sqrt(Math.max(left, 0.25));
  return 1 - normalCdf(target - 0.5, projected, sd);
}

export function expectedInningsTotal(overs: number, rpo: number, wickets: number): number | null {
  const decimal = cricketOvers(overs);
  if (decimal === null) return null;
  return rpo * decimal * wicketFactor(wickets);
}

export function winFromExpected(scoreA: number, scoreB: number): { a: number; b: number; tie: number } {
  const sd = Math.max(12, Math.sqrt(Math.max(scoreA, 1) + Math.max(scoreB, 1)) * 4);
  const pB = 1 - normalCdf(scoreA + 0.5, scoreB, sd);
  const pA = normalCdf(scoreA - 0.5, scoreB, sd);
  const tie = Math.max(0, 1 - pA - pB);
  return { a: pA, b: pB, tie };
}
