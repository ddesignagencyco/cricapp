/**
 * Approximate remaining batting resources (%) by overs left and wickets lost.
 * Shaped like ICC DLS/VJD tables for T20/ODI (not licensed official tables).
 * Values are percent of innings resources still available (0–100).
 */

function buildGrid(maxOvers, baseDecay) {
  const grid = [];
  for (let oversLeft = 0; oversLeft <= maxOvers; oversLeft += 1) {
    const row = [];
    const ballFrac = oversLeft / maxOvers;
    for (let wicketsLost = 0; wicketsLost <= 9; wicketsLost += 1) {
      const wicketsLeft = 10 - wicketsLost;
      const wicketFrac = Math.sqrt(wicketsLeft / 10);
      const raw = 100 * Math.pow(ballFrac, baseDecay) * (0.28 + 0.72 * wicketFrac);
      row.push(Number(Math.max(0, Math.min(100, raw)).toFixed(2)));
    }
    grid.push(row);
  }
  // Full innings start must be 100 with 0 wickets.
  grid[maxOvers][0] = 100;
  return grid;
}

const TABLES = Object.freeze({
  t20: buildGrid(20, 0.85),
  odi: buildGrid(50, 0.9),
  test: buildGrid(90, 0.95),
});

export function resourceTable(format) {
  if (format === 'odi') return TABLES.odi;
  if (format === 'test') return TABLES.test;
  return TABLES.t20;
}

/**
 * @returns remaining resources in [0, 1]
 */
export function resourcesRemainingFromTable({
  format = 't20',
  remainingBalls,
  allottedBalls,
  wicketsLost = 0,
}) {
  const table = resourceTable(format);
  const maxOvers = table.length - 1;
  const allotted = allottedBalls > 0 ? allottedBalls : maxOvers * 6;
  const oversLeft = Math.max(
    0,
    Math.min(maxOvers, Math.round((Number(remainingBalls) || 0) / 6)),
  );
  const wickets = Math.max(0, Math.min(9, Math.floor(Number(wicketsLost) || 0)));
  const pct = table[oversLeft]?.[wickets];
  if (typeof pct === 'number') return pct / 100;
  // Fallback if grid miss.
  const ballFrac = allotted <= 0 ? 0 : Math.max(0, remainingBalls) / allotted;
  const wicketFrac = Math.sqrt(Math.max(0, 10 - wickets) / 10);
  return Math.max(0, Math.min(1, ballFrac * (0.35 + 0.65 * wicketFrac)));
}
