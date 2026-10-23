function parseScore(score) {
  if (!score || typeof score !== 'string') return null;
  const m = score.match(/^(\d+)\/(\d+)/);
  if (!m) return null;
  return { runs: Number(m[1]), wickets: Number(m[2]) };
}

export function teamTokenMatches(batting, token) {
  if (!batting || !token) return false;
  const b = String(batting).toLowerCase().trim();
  const t = String(token).toLowerCase().trim();
  if (b === t) return true;
  if (t.length >= 2 && b.length >= 2 && (b.includes(t) || t.includes(b))) return true;
  return false;
}

export function battingIsHomeTeam(snapshot) {
  const batting = snapshot.currentInnings?.battingTeam;
  if (!batting) return null;
  const candidates = [
    { side: true, tokens: [snapshot.homeTeamId, snapshot.homeAbbr, snapshot.homeName] },
    { side: false, tokens: [snapshot.awayTeamId, snapshot.awayAbbr, snapshot.awayName] },
  ];
  for (const { side, tokens } of candidates) {
    if (tokens.some((t) => teamTokenMatches(batting, t))) return side;
  }
  return null;
}

/** Skip live model when the match is done or inputs are unusable. */
export function shouldSkipLivePrediction(snapshot) {
  if (snapshot.status === 'completed') return 'completed';
  // The live model treats a match as one innings per side with no draw. A Test has up
  // to four innings and draws, so its live number was often confidently wrong (and a
  // first-innings all-out locked it at 100/0). Tests get no live model until one
  // exists that understands them.
  if (snapshot.format === 'test') return 'test_format';
  const ms = String(snapshot.matchStatus ?? '').toLowerCase();
  // Words must start a token: a bare `ended` also matched "susp-ended".
  if (/(?<![a-z])(won|tied|draw|abandon|closed|ended|complete|result)/.test(ms)) return 'decided';

  const inning = snapshot.currentInning >= 2 ? 2 : 1;
  const innings = snapshot.currentInnings ?? {};
  const w = innings.wickets ?? 0;
  if (inning >= 2 && w >= 10) return 'all_out';

  const home = parseScore(snapshot.teamScores?.home?.score);
  const away = parseScore(snapshot.teamScores?.away?.score);
  if (inning >= 2 && home?.runs && away && away.wickets >= 10 && away.runs < home.runs) {
    return 'chase_over';
  }

  if (
    inning >= 2 &&
    (innings.runs ?? 0) === 0 &&
    (innings.wickets ?? 0) === 0 &&
    away?.wickets >= 10
  ) {
    return 'stale_innings';
  }

  return null;
}

export function decidedWinProb(snapshot) {
  // One side all out for less is decisive only with one innings each.
  if (snapshot.format === 'test') return null;
  const home = parseScore(snapshot.teamScores?.home?.score);
  const away = parseScore(snapshot.teamScores?.away?.score);
  if (!home?.runs || !away) return null;
  if (away.wickets >= 10 && away.runs < home.runs) {
    return { homeWinProb: 1, awayWinProb: 0 };
  }
  if (home.wickets >= 10 && home.runs < away.runs) {
    return { homeWinProb: 0, awayWinProb: 1 };
  }
  return null;
}
