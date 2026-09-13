export function predictedFavorite(homeTeamId, awayTeamId, homeWinProb) {
  if (homeWinProb === 0.5) return null;
  return homeWinProb > 0.5 ? homeTeamId : awayTeamId;
}

export function brierScore(homeWinProb, homeWon) {
  const actual = homeWon ? 1 : 0;
  return (homeWinProb - actual) ** 2;
}

function sigmoid(z) {
  const clipped = Math.max(-20, Math.min(20, z));
  return 1 / (1 + Math.exp(-clipped));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function fitPlattCalibration(rows, { minSamples = 8, iterations = 40 } = {}) {
  const points = rows.filter(
    (row) => Number.isFinite(row.z) && (row.homeWon === true || row.homeWon === false),
  );
  if (points.length < minSamples) {
    return { applied: false, reason: 'insufficient_sample', sampleSize: points.length };
  }

  let intercept = 0;
  let slope = 1;
  for (let step = 0; step < iterations; step += 1) {
    let g0 = 0;
    let g1 = 0;
    let h00 = 0;
    let h01 = 0;
    let h11 = 0;
    for (const point of points) {
      const pred = sigmoid(intercept + slope * point.z);
      const err = pred - (point.homeWon ? 1 : 0);
      const weight = Math.max(1e-6, pred * (1 - pred));
      g0 += err;
      g1 += err * point.z;
      h00 += weight;
      h01 += weight * point.z;
      h11 += weight * point.z * point.z;
    }
    const det = h00 * h11 - h01 * h01;
    if (Math.abs(det) < 1e-9) break;
    intercept -= (h11 * g0 - h01 * g1) / det;
    slope -= (-h01 * g0 + h00 * g1) / det;
  }

  slope = Number(clamp(slope, 0.25, 2.5).toFixed(4));
  intercept = Number(clamp(intercept, -2, 2).toFixed(4));

  let brier = 0;
  let correct = 0;
  for (const point of points) {
    const homeWinProb = sigmoid(slope * point.z + intercept);
    brier += brierScore(homeWinProb, point.homeWon);
    const favoriteHome = homeWinProb > 0.5;
    if ((favoriteHome && point.homeWon) || (!favoriteHome && !point.homeWon && homeWinProb !== 0.5)) {
      correct += 1;
    }
  }

  return {
    applied: true,
    slope,
    intercept,
    sampleSize: points.length,
    brierScore: Number((brier / points.length).toFixed(4)),
    accuracy: Number((correct / points.length).toFixed(4)),
  };
}

export function summarizePerformance(rows) {
  const usable = rows.filter((r) => r.actualWinnerId && r.homeTeamId && r.awayTeamId);
  let correct = 0;
  let brier = 0;
  const byFormat = new Map();

  for (const row of usable) {
    const favorite = predictedFavorite(row.homeTeamId, row.awayTeamId, row.homeWinProb);
    const hit = favorite === row.actualWinnerId;
    if (hit) correct += 1;
    const homeWon = row.actualWinnerId === row.homeTeamId;
    brier += brierScore(row.homeWinProb, homeWon);
    const format = row.format || 'unknown';
    if (!byFormat.has(format)) byFormat.set(format, { sampleSize: 0, correct: 0 });
    const bucket = byFormat.get(format);
    bucket.sampleSize += 1;
    if (hit) bucket.correct += 1;
  }

  const sampleSize = usable.length;
  return {
    sampleSize,
    accuracy: sampleSize ? Number((correct / sampleSize).toFixed(4)) : null,
    brierScore: sampleSize ? Number((brier / sampleSize).toFixed(4)) : null,
    byFormat: [...byFormat.entries()].map(([format, v]) => ({
      format,
      sampleSize: v.sampleSize,
      accuracy: Number((v.correct / v.sampleSize).toFixed(4)),
    })),
  };
}
