import {
  buildMatchScoreboard,
  compactMatchScore,
  describeMatchResult,
  isBattingSide,
  pickMatchSides,
  scoreboardFromMatch,
  sideScoreLine,
} from '../lib/matchScoreboard';

const sides = {
  home: { name: 'Islamabad', code: 'ISL', raw: 'Islamabad', overs: '' },
  away: { name: 'Lahore', code: 'LQA', raw: 'Lahore', overs: '' },
};

describe('isBattingSide', () => {
  it('matches on code, name, and raw value', () => {
    expect(isBattingSide('ISL', sides.home)).toBe(true);
    expect(isBattingSide('Islamabad', sides.home)).toBe(true);
    expect(isBattingSide('Lahore', sides.away)).toBe(true);
  });

  it('does not treat a short code as a substring of a longer word', () => {
    // The original bug this guards: "BU" must not match "Bulls" when the side is "Blues".
    const blues = { name: 'Blues', code: 'BLU', raw: 'Blues' };
    expect(isBattingSide('BU', blues)).toBe(false);
    expect(isBattingSide('Bulls', blues)).toBe(false);
    expect(isBattingSide('Blues', blues)).toBe(true);
  });

  it('returns false for empty or unknown values', () => {
    expect(isBattingSide(undefined, sides.home)).toBe(false);
    expect(isBattingSide('', sides.home)).toBe(false);
    expect(isBattingSide('Karachi', sides.home)).toBe(false);
  });
});

describe('buildMatchScoreboard', () => {
  it('puts a live score on the batting side and leaves the other alone', () => {
    const board = buildMatchScoreboard({
      home: { ...sides.home, score: '150/4' },
      away: { ...sides.away, score: '' },
      battingTeam: 'ISL',
      matchStatus: 'second_innings_home',
      innRuns: 155,
      innWkts: 4,
      innOvers: 18.2,
      live: true,
    });
    expect(board.battingIsHome).toBe(true);
    expect(board.homeScore).toBe('155/4');
    expect(board.homeOvers).toBe('18.2');
    expect(board.awayScore).toBe('');
  });

  it('does not touch a stored score when the match is not live', () => {
    // The live innings only overwrites the batting side while `live` is set,
    // so a completed match keeps whatever the feed stored.
    const board = buildMatchScoreboard({
      home: { ...sides.home, score: '150/4' },
      away: { ...sides.away, score: '' },
      battingTeam: 'ISL',
      innRuns: 155,
      innWkts: 4,
      innOvers: 18.2,
    });
    expect(board.homeScore).toBe('150/4');
  });

  it('assumes the home side is batting when nothing indicates otherwise', () => {
    const board = buildMatchScoreboard({
      home: { ...sides.home, score: '150/4' },
      away: { ...sides.away, score: '' },
      innRuns: 150,
      innWkts: 4,
      innOvers: 20,
    });
    expect(board.battingIsHome).toBe(true);
  });

  it('keeps a completed innings score instead of overwriting it with a zero line', () => {
    const board = buildMatchScoreboard({
      home: { ...sides.home, score: '210/6' },
      away: { ...sides.away, score: '' },
      battingTeam: 'LQA',
      matchStatus: 'first_innings_home',
      innRuns: 0,
      innWkts: 0,
      innOvers: 0,
      live: true,
    });
    // Home is not the batting side here, and 0/0 is empty so it must not be written.
    expect(board.awayScore).not.toBe('0/0');
  });

  it('produces an empty score line when the innings has no runs', () => {
    const board = buildMatchScoreboard({
      home: { ...sides.home, score: '' },
      away: { ...sides.away, score: '' },
      innRuns: 0,
      innWkts: 0,
      innOvers: 0,
    });
    expect(board.scoreLine).toBe('');
  });
});

describe('pickMatchSides', () => {
  it('falls back to teamNames when teams carry no name', () => {
    const picked = pickMatchSides({
      teams: { home: { code: 'sr:competitor:1' }, away: { code: 'sr:competitor:2' } },
      teamNames: ['Karachi Kings', 'Lahore Qalandars'],
    });
    expect(picked.home.name).toBe('Karachi Kings');
    expect(picked.away.name).toBe('Lahore Qalandars');
  });

  it('derives a short code from the name when no usable code exists', () => {
    const picked = pickMatchSides({ teams: { home: { name: 'Quetta' } } });
    expect(picked.home.code).toBe('QUE');
  });
});

describe('scoreboardFromMatch', () => {
  const match = {
    teams: { home: { name: 'Islamabad', code: 'ISL', score: '180/5' }, away: { name: 'Lahore', code: 'LQA', score: '165/8' } },
    status: 'completed',
  };

  it('reads both sides', () => {
    const board = scoreboardFromMatch(match);
    expect(board.homeScore).toBe('180/5');
    expect(board.awayScore).toBe('165/8');
  });
});

describe('compactMatchScore', () => {
  it('joins both sides with a dot', () => {
    expect(
      compactMatchScore({
        teams: { home: { name: 'A', score: '180/5' }, away: { name: 'B', score: '165/8' } },
        status: 'completed',
      })
    ).toBe('180/5 · 165/8');
  });

  it('returns a dash when nothing is stored', () => {
    expect(compactMatchScore({ teams: { home: { name: 'A' }, away: { name: 'B' } } })).toBe('—');
  });
});

describe('sideScoreLine', () => {
  it('formats each side separately, which is what the table cells use', () => {
    const match = {
      teams: {
        home: { name: 'Islamabad', code: 'ISL', score: '180/5', overs: '20' },
        away: { name: 'Lahore', code: 'LQA', score: '165/8', overs: '19.4' },
      },
      status: 'completed',
    };
    expect(sideScoreLine(match, 'home')).toBe('180/5 (20)');
    expect(sideScoreLine(match, 'away')).toBe('165/8 (19.4)');
  });

  it('omits the overs bracket when there is no overs figure', () => {
    const match = {
      teams: { home: { name: 'A', score: '150/3' }, away: { name: 'B' } },
      status: 'completed',
    };
    expect(sideScoreLine(match, 'home')).toBe('150/3');
  });

  it('returns an empty string for a side with no score so the cell can be skipped', () => {
    const match = {
      teams: { home: { name: 'A', score: '150/3' }, away: { name: 'B', score: '' } },
      status: 'upcoming',
    };
    expect(sideScoreLine(match, 'away')).toBe('');
  });
});

describe('describeMatchResult', () => {
  it('describes a chase won with wickets in hand', () => {
    expect(
      describeMatchResult({
        teams: { home: { name: 'Lahore', score: '181/4' }, away: { name: 'Islamabad', score: '180/7' } },
        status: 'completed',
      })
    ).toBe('Lahore won by 6 wickets');
  });

  it('describes a comfortable win, and exposes a known limitation', () => {
    // KNOWN BUG (matchScoreboard.ts:222): `chased` is decided by
    // `loserScore.runs < winnerScore.runs`, which assumes the winner chased. With
    // 200/8 vs 150/9 the winner actually batted first and defended, so the honest
    // answer is "A won by 50 runs" — but the code says wickets because it cannot
    // see who batted first. This test pins the current behaviour so the change is
    // deliberate when someone fixes it.
    expect(
      describeMatchResult({
        teams: { home: { name: 'A', score: '200/8' }, away: { name: 'B', score: '150/9' } },
        status: 'completed',
      })
    ).toBe('A won by 2 wickets');
  });

  it('prefers a stored result string over anything it derives', () => {
    expect(
      describeMatchResult({
        result: 'Islamabad won by 5 wickets',
        teams: { home: { name: 'A', score: '200/8' }, away: { name: 'B', score: '150/9' } },
        status: 'completed',
      })
    ).toBe('Islamabad won by 5 wickets');
  });

  it('ignores a placeholder result and derives from the scores', () => {
    expect(
      describeMatchResult({
        result: 'completed',
        teams: { home: { name: 'Lahore', score: '181/4' }, away: { name: 'Islamabad', score: '180/7' } },
        status: 'completed',
      })
    ).toBe('Lahore won by 6 wickets');
  });

  it('reports a tie rather than picking a winner', () => {
    expect(
      describeMatchResult({
        teams: { home: { name: 'A', score: '150/5' }, away: { name: 'B', score: '150/5' } },
        status: 'completed',
      })
    ).toBe('Match tied');
  });
});
