export function predictedFavorite(homeTeamId, awayTeamId, homeWinProb) {
  if (homeWinProb === 0.5) return null;
  return homeWinProb > 0.5 ? homeTeamId : awayTeamId;
}

export function brierScore(homeWinProb, homeWon) {
  const actual = homeWon ? 1 : 0;
  return (homeWinProb - actual) ** 2;
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
