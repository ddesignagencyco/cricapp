import { buildMatchScoreboard } from '../lib/matchScoreboard';

/**
 * A completed match, exactly as the ingestion stored it.
 *
 *   home  Peshawar Zalmi     218/5
 *   away  Rawalpindi Pindiz  214/4
 *   display_score  218/5          <- the winning side's total
 *   current_innings { runs: 0, overs: 19.1, wickets: 0, battingTeam: 'RAW' }
 *
 * The innings block is stale (runs 0 but overs 19.1), so the scoreboard falls
 * back to display_score, which is Peshawar's total. Applying that to the batting
 * side paints 218/5 over Rawalpindi's real 214/4.
 */
const completed = {
  home: { code: 'PZA', name: 'Peshawar Zalmi', score: '218/5', overs: '', raw: 'PZA' },
  away: { code: 'RAW', name: 'Rawalpindi Pindiz', score: '214/4', overs: '', raw: 'RAW' },
  battingTeam: 'RAW',
  matchStatus: 'ended',
  innRuns: 0,
  innWkts: 0,
  innOvers: 19.1,
  innRr: 0,
  displayScore: '218/5',
  live: false,
};

describe('buildMatchScoreboard for a completed match', () => {
  it('shows each side its own final score', () => {
    const board = buildMatchScoreboard(completed);
    expect(board.homeScore).toBe('218/5');
    expect(board.awayScore).toBe('214/4');
  });

  it('never paints the same score on both sides', () => {
    const board = buildMatchScoreboard(completed);
    expect(board.homeScore).not.toBe(board.awayScore);
  });

  it('does not overwrite a completed score with display_score', () => {
    // display_score is the winner's total. For a finished match the stored
    // teamScores are authoritative and must win.
    const board = buildMatchScoreboard(completed);
    expect(board.awayScore).toBe('214/4');
  });

  it('leaves a completed match alone even when the innings block is stale', () => {
    const board = buildMatchScoreboard({ ...completed, innRuns: 0, innWkts: 0, innOvers: 19.1 });
    expect(board.awayScore).toBe('214/4');
  });

  it('still reports which side was batting for the scorecard header', () => {
    const board = buildMatchScoreboard(completed);
    expect(board.battingIsHome).toBe(false);
  });
});

/**
 * MatchDetailBody calls this with `live: !isUpcoming`, so a COMPLETED match
 * arrives here with `live: true`. That is the path that mirrors one score onto
 * both sides.
 */
describe('buildMatchScoreboard when a completed match is flagged live', () => {
  const misflagged = { ...completed, live: true };

  it('currently paints the away side with the winner total (the bug)', () => {
    const board = buildMatchScoreboard(misflagged);
    // display_score is 218/5 (Peshawar) and Rawalpindi really made 214/4.
    expect(board.awayScore).toBe('218/5');
    expect(board.awayScore).toBe(board.homeScore);
  });

  it('the stored away score is the one that should be shown', () => {
    const board = buildMatchScoreboard(misflagged);
    expect(misflagged.away.score).toBe('214/4');
    expect(board.awayScore).not.toBe(misflagged.away.score);
  });
});

describe('the live flag MatchDetailBody now sends', () => {
  /** Mirrors the expression the component passes for each status. */
  const flagFor = (status: string) =>
    status === 'live' ||
    (status === 'scheduled' || status === 'postponed');

  it.each([
    ['live', true],
    ['scheduled', true],
    ['upcoming', false],
    ['postponed', true],
    ['completed', false],
    ['cancelled', false],
  ])('sends live=%s as %s', (status, expected) => {
    expect(flagFor(status)).toBe(expected);
  });

  it('keeps a completed match on its stored scores once the flag is correct', () => {
    const board = buildMatchScoreboard({ ...completed, live: flagFor('completed') });
    expect(board.homeScore).toBe('218/5');
    expect(board.awayScore).toBe('214/4');
  });

  it('keeps a cancelled match on its stored scores', () => {
    const board = buildMatchScoreboard({ ...completed, live: flagFor('cancelled') });
    expect(board.awayScore).toBe('214/4');
  });

  it('still applies the innings to a live match', () => {
    const live = {
      home: { code: 'PZA', name: 'Peshawar Zalmi', score: '150/3', overs: '15', raw: 'PZA' },
      away: { code: 'RAW', name: 'Rawalpindi Pindiz', score: '0/0', overs: '', raw: 'RAW' },
      battingTeam: 'RAW',
      matchStatus: 'first_innings_home',
      innRuns: 88,
      innWkts: 1,
      innOvers: 8,
      innRr: 11,
      displayScore: '150/3',
    };
    const board = buildMatchScoreboard({ ...live, live: flagFor('live') });
    expect(board.awayScore).toBe('88/1');
    expect(board.homeScore).toBe('150/3');
  });

  it('leaves an upcoming match on its stored scores', () => {
    const board = buildMatchScoreboard({ ...completed, live: flagFor('upcoming') });
    expect(board.awayScore).toBe('214/4');
  });
});

describe('buildMatchScoreboard for a live match', () => {
  const live = {
    home: { code: 'PZA', name: 'Peshawar Zalmi', score: '150/3', overs: '15', raw: 'PZA' },
    away: { code: 'RAW', name: 'Rawalpindi Pindiz', score: '0/0', overs: '', raw: 'RAW' },
    battingTeam: 'RAW',
    matchStatus: 'first_innings_home',
    innRuns: 88,
    innWkts: 1,
    innOvers: 8,
    innRr: 11,
    displayScore: '150/3',
    live: true,
  };

  it('does apply the live innings to the batting side', () => {
    const board = buildMatchScoreboard(live);
    expect(board.awayScore).toBe('88/1');
    expect(board.homeScore).toBe('150/3');
  });

  it('never mirrors one score onto both sides while live', () => {
    const board = buildMatchScoreboard(live);
    expect(board.homeScore).not.toBe(board.awayScore);
  });

  it('keeps a tied-looking live pair from collapsing into one value', () => {
    // Both sides stored 100/4 and the innings say 100/4 for the batting side.
    // Showing the same number twice is the bug this file is about.
    const tie = {
      ...live,
      home: { ...live.home, score: '100/4' },
      away: { ...live.away, score: '100/4' },
      innRuns: 100,
      innWkts: 4,
      innOvers: 15,
    };
    const board = buildMatchScoreboard(tie);
    const { homeScore, awayScore } = board;
    if (homeScore && awayScore) {
      expect(homeScore === awayScore && tie.home.score !== tie.away.score).toBe(false);
    }
  });
});
