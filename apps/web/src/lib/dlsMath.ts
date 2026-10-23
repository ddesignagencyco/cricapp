/**
 * Educational Duckworth–Lewis resource model (1998 exponential form).
 * Not the licensed ICC DLS/Stern tables — labelled as such in the UI.
 * Z(u,w) = Z0[w] * (1 − exp(−b[w] * u)); resource = 100 * Z / Z(N, 0).
 */
const Z0 = [245.0, 233.5, 217.1, 196.0, 170.2, 140.9, 108.4, 73.5, 40.7, 13.2];
const B = [0.03145, 0.03264, 0.03393, 0.0353, 0.0368, 0.03875, 0.0417, 0.0458, 0.0535, 0.07132];

export type DlsFormat = 'odi' | 't20';

export function formatOvers(format: DlsFormat): number {
  return format === 't20' ? 20 : 50;
}

export function g50(format: DlsFormat): number {
  return format === 't20' ? 152 : 245;
}

function clampWickets(wickets: number): number {
  if (!Number.isFinite(wickets) || wickets < 0) return 0;
  return Math.min(9, Math.floor(wickets));
}

function scoreCapacity(oversLeft: number, wicketsLost: number): number {
  const w = clampWickets(wicketsLost);
  const u = Math.max(0, oversLeft);
  if (u <= 0) return 0;
  return Z0[w] * (1 - Math.exp(-B[w] * u));
}

/** Percent of a full innings still remaining. All-out ⇒ 0. */
export function resourceRemaining(
  oversLeft: number,
  wicketsLost: number,
  scheduled: number,
  allOut = false
): number {
  if (allOut || oversLeft <= 0) return 0;
  const full = scoreCapacity(scheduled, 0);
  if (full <= 0) return 0;
  return (100 * scoreCapacity(Math.min(oversLeft, scheduled), wicketsLost)) / full;
}

export function resourcesUsed(
  oversFaced: number,
  wicketsLost: number,
  scheduled: number,
  allOut = false
): number {
  const left = Math.max(0, scheduled - oversFaced);
  return 100 - resourceRemaining(left, wicketsLost, scheduled, allOut || wicketsLost >= 10);
}

export function revisedTarget(team1Score: number, r1: number, r2: number, format: DlsFormat): number | null {
  if (r1 <= 0 || team1Score < 0) return null;
  const G = g50(format);
  if (r2 < r1) {
    return Math.floor(team1Score * (r2 / r1)) + 1;
  }
  if (r2 > r1) {
    return Math.floor(team1Score + (G * (r2 - r1)) / 100) + 1;
  }
  return team1Score + 1;
}

export function parScore(team1Score: number, r1: number, r2Used: number, format: DlsFormat): number | null {
  if (r1 <= 0) return null;
  const G = g50(format);
  if (r2Used <= r1) {
    return Math.floor(team1Score * (r2Used / r1));
  }
  return Math.floor(team1Score + (G * (r2Used - r1)) / 100);
}

/**
 * The calculator's wiring, kept pure so it can be tested. Overs are decimal overs
 * (cricket 10.3 is 10.5 here) and are expected to be validated already.
 *
 * R1 is what Team 1 used of a full innings. R2 is what Team 2 has: the resources of
 * its allocated overs with no wickets down. Team 2's par uses what it has spent of
 * that allocation, so a 20-over chase is measured against 20 overs, not 50.
 */
export function dlsEstimate(args: {
  format: DlsFormat;
  team1Score: number;
  team1Overs: number;
  team1Wickets: number;
  team1AllOut?: boolean;
  team2Overs?: number | null;
  team2Faced?: number | null;
  team2Wickets?: number;
}): { r1: number; r2: number; target: number | null; par: number | null } {
  const scheduled = formatOvers(args.format);
  const alloc2 = Math.min(args.team2Overs ?? scheduled, scheduled);
  const r1 = resourcesUsed(args.team1Overs, args.team1Wickets, scheduled, Boolean(args.team1AllOut));
  const r2 = resourceRemaining(alloc2, 0, scheduled, false);
  const target = revisedTarget(args.team1Score, r1, r2, args.format);
  let par: number | null = null;
  if (args.team2Faced !== null && args.team2Faced !== undefined && target !== null) {
    const wickets2 = args.team2Wickets ?? 0;
    const left = Math.max(0, alloc2 - args.team2Faced);
    const used2 = r2 - resourceRemaining(left, wickets2, scheduled, wickets2 >= 10);
    par = parScore(args.team1Score, r1, used2, args.format);
  }
  return { r1, r2, target, par };
}
