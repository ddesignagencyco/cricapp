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
