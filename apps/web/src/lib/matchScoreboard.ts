import { currentRunRate, formatCricketOvers, formatRate } from './cricketMath';

export type ScoreSide = { code: string; name: string; raw?: string; score: string; overs: string };

function norm(value: string): string {
  return String(value || '')
    .replace(/^sr:competitor:/, '')
    .trim()
    .toLowerCase();
}

function sideTokens(side: { code: string; name: string; raw?: string }): string[] {
  const raw = [side.code, side.name, side.raw].map((part) => norm(String(part || ''))).filter(Boolean);
  const tokens = new Set<string>(raw);
  for (const part of raw) {
    for (const word of part.split(/[^a-z0-9]+/).filter(Boolean)) tokens.add(word);
  }
  return [...tokens];
}

function parseScore(score: string): { runs: number; wickets: number | null } | null {
  const m = String(score || '')
    .replace(/\s+/g, '')
    .match(/^(\d+)(?:\/(\d+))?/);
  if (!m) return null;
  const runs = Number(m[1]);
  if (!Number.isFinite(runs)) return null;
  const wickets = m[2] === undefined ? null : Number(m[2]);
  return { runs, wickets: Number.isFinite(wickets) ? wickets : null };
}

function finishedFirstInnings(score: string, liveRuns: number): boolean {
  const parsed = parseScore(score);
  if (!parsed) return false;
  if (parsed.wickets !== null && parsed.wickets >= 10) return true;
  return parsed.runs > liveRuns + 15;
}

/**
 * Match battingTeam to a side without treating BU as BLU or "bulls" as "blu".
 */
export function isBattingSide(
  battingTeam: string | undefined,
  side: { code: string; name: string; raw?: string }
): boolean {
  const needle = norm(battingTeam || '');
  if (!needle) return false;
  const tokens = sideTokens(side);
  if (tokens.includes(needle)) return true;
  if (needle.length < 3) return false;
  return tokens.some((token) => token.length >= 3 && (token.startsWith(needle) || needle.startsWith(token)));
}

function battingFromStatus(matchStatus?: string): boolean | null {
  const phase = String(matchStatus || '');
  if (/second_innings_home|first_innings_home|home_batting/i.test(phase)) return true;
  if (/second_innings_away|first_innings_away|away_batting/i.test(phase)) return false;
  return null;
}

export function buildMatchScoreboard(input: {
  home: ScoreSide;
  away: ScoreSide;
  battingTeam?: string;
  matchStatus?: string;
  innRuns?: number;
  innWkts?: number;
  innOvers?: number;
  innRr?: number;
  displayScore?: string;
  live?: boolean;
}) {
  const innRunsRaw = Number(input.innRuns);
  const innWktsRaw = Number(input.innWkts);
  const innOvers = Number(input.innOvers);
  const innEmpty =
    !Number.isFinite(innRunsRaw) ||
    (innRunsRaw === 0 && (!Number.isFinite(innWktsRaw) || innWktsRaw === 0));
  const displayParsed = parseScore(String(input.displayScore || ''));
  const innRuns = innEmpty && displayParsed && displayParsed.runs > 0 ? displayParsed.runs : innRunsRaw;
  const innWkts =
    innEmpty && displayParsed && displayParsed.runs > 0
      ? displayParsed.wickets ?? 0
      : innWktsRaw;
  const scoreLine =
    Number.isFinite(innRuns) && (innRuns > 0 || (Number.isFinite(innWkts) && innWkts > 0))
      ? `${innRuns}/${Number.isFinite(innWkts) ? innWkts : 0}`
      : '';
  const oversLabel = formatCricketOvers(innOvers);
  const computedRr = currentRunRate(Number.isFinite(innRuns) ? innRuns : 0, innOvers);
  const innRr = Number(input.innRr);
  const rrLabel =
    Number.isFinite(innRr) && innRr > 0 ? formatRate(innRr) : formatRate(computedRr);

  const homeBat = isBattingSide(input.battingTeam, input.home);
  const awayBat = isBattingSide(input.battingTeam, input.away);
  let battingIsHome = homeBat && !awayBat ? true : awayBat && !homeBat ? false : battingFromStatus(input.matchStatus);

  if (battingIsHome === null && scoreLine && input.live) {
    const homeDone = finishedFirstInnings(input.home.score, innRuns);
    const awayDone = finishedFirstInnings(input.away.score, innRuns);
    if (homeDone && !awayDone) battingIsHome = false;
    else if (awayDone && !homeDone) battingIsHome = true;
    else if (homeDone && parseScore(input.home.score)?.runs !== innRuns) battingIsHome = false;
    else battingIsHome = true;
  }
  if (battingIsHome === null) battingIsHome = true;

  let homeScore = input.home.score;
  let awayScore = input.away.score;
  let homeOvers = formatCricketOvers(input.home.overs) || input.home.overs;
  let awayOvers = formatCricketOvers(input.away.overs) || input.away.overs;

  if (input.live && scoreLine) {
    const homeDone = finishedFirstInnings(homeScore, innRuns);
    const awayDone = finishedFirstInnings(awayScore, innRuns);
    if (battingIsHome && homeDone && parseScore(homeScore)?.runs !== innRuns) {
      battingIsHome = false;
    } else if (!battingIsHome && awayDone && parseScore(awayScore)?.runs !== innRuns) {
      battingIsHome = true;
    }

    if (battingIsHome) {
      homeScore = scoreLine;
      if (oversLabel) homeOvers = oversLabel;
    } else {
      awayScore = scoreLine;
      if (oversLabel) awayOvers = oversLabel;
    }
  }

  return {
    homeScore,
    awayScore,
    homeOvers,
    awayOvers,
    scoreLine,
    oversLabel,
    rrLabel,
    battingIsHome,
    battingLabel: battingIsHome ? input.home.code : input.away.code,
  };
}

function usefulText(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || text === '—' || text === '0/0' || text === '0-0' || text === '0') return '';
  return text;
}

export function pickMatchSides(match: any): { home: ScoreSide; away: ScoreSide } {
  const teams = match?.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const scores = match?.teamScores;
  const home = isObj ? teams.home : scores?.home;
  const away = isObj ? teams.away : scores?.away;
  const side = (raw: any, index: 0 | 1): ScoreSide => {
    const name = String(raw?.name || match?.teamNames?.[index] || (Array.isArray(teams) ? teams[index] : '') || '')
      .replace(/^sr:competitor:/, '') || (index === 0 ? 'Team A' : 'Team B');
    const codeRaw = String(raw?.code || raw?.abbr || (Array.isArray(teams) ? teams[index] : '') || '')
      .replace(/^sr:competitor:/, '');
    return {
      name,
      code: codeRaw && codeRaw.length <= 5 && !/^sr:/.test(codeRaw) ? codeRaw.toUpperCase() : name.slice(0, 3).toUpperCase(),
      raw: String(raw?.code || raw?.name || ''),
      score: usefulText(raw?.score),
      overs: String(raw?.overs || '').trim(),
    };
  };
  return { home: side(home, 0), away: side(away, 1) };
}

export function scoreboardFromMatch(match: any) {
  const { home, away } = pickMatchSides(match);
  const inn = match?.currentInnings;
  const live = match?.status === 'live';
  const board = buildMatchScoreboard({
    home,
    away,
    battingTeam: String(inn?.battingTeam || ''),
    matchStatus: String(match?.matchStatus || ''),
    innRuns: Number(inn?.runs),
    innWkts: Number(inn?.wickets),
    innOvers: Number(inn?.overs),
    innRr: Number(inn?.runRate),
    displayScore: usefulText(match?.displayScore),
    live,
  });
  return { home, away, ...board };
}

export function compactMatchScore(match: any): string {
  const board = scoreboardFromMatch(match);
  const home = usefulText(board.homeScore);
  const away = usefulText(board.awayScore);
  if (home && away) return `${home} · ${away}`;
  if (home || away) return home || away;
  if (board.scoreLine) return board.scoreLine;
  return usefulText(match?.displayScore) || '—';
}

export function describeMatchResult(match: any): string {
  const stored = usefulText(match?.result || match?.resultText || match?.matchResult);
  if (stored && !/^(ended|completed|finished|match ended)$/i.test(stored)) return stored;
  const { home, away, homeScore, awayScore } = scoreboardFromMatch(match);
  const homeParsed = parseScore(homeScore);
  const awayParsed = parseScore(awayScore);
  if (!homeParsed || !awayParsed) return stored;
  if (homeParsed.runs === awayParsed.runs) return 'Match tied';
  const homeWon = homeParsed.runs > awayParsed.runs;
  const winner = homeWon ? home.name : away.name;
  const winnerScore = homeWon ? homeParsed : awayParsed;
  const loserScore = homeWon ? awayParsed : homeParsed;
  const chased = winnerScore.wickets !== null && winnerScore.wickets < 10 && loserScore.runs < winnerScore.runs;
  if (chased) {
    const left = 10 - winnerScore.wickets;
    return `${winner} won by ${left} wicket${left === 1 ? '' : 's'}`;
  }
  const margin = Math.abs(homeParsed.runs - awayParsed.runs);
  return `${winner} won by ${margin} run${margin === 1 ? '' : 's'}`;
}
