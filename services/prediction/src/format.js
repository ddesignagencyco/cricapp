export function detectFormat(tournament, matchStatus) {
  const text = `${tournament ?? ''} ${matchStatus ?? ''}`.toLowerCase();
  if (/\btest\b/.test(text)) return 'test';
  if (/\bodi\b|one.?day/.test(text)) return 'odi';
  if (/\bt20\b|twenty|psl|ipl|bbl|cpl|hundred|super league/.test(text)) return 't20';
  return 'unknown';
}

export function allottedBallsForFormat(format) {
  if (format === 'odi') return 300;
  if (format === 'test') return 540;
  return 120;
}

export function parScoreForFormat(format) {
  if (format === 'odi') return 270;
  if (format === 'test') return 320;
  return 160;
}
