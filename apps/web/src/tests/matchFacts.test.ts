import {
  describeToss,
  resolveSideById,
  tossWinnerName,
  describeMargin,
  winnerName,
  periodScoreRows,
  matchFacts,
  isDecided,
} from '../lib/matchFacts';

const live = {
  matchId: 'sr:match:74194424',
  status: 'live',
  teams: {
    home: { id: 'sr:competitor:1', code: 'LHR', name: 'Lahore Qalandars', score: '150/3' },
    away: { id: 'sr:competitor:2', code: 'ISB', name: 'Islamabad United', score: '0/0' },
  },
};

const done = {
  ...live,
  status: 'completed',
  teams: {
    home: { ...live.teams.home, score: '180/4' },
    away: { ...live.teams.away, score: '150/9' },
  },
};

describe('resolveSideById', () => {
  it('matches a full competitor id against the object teams form', () => {
    expect(resolveSideById(live, 'sr:competitor:1')).toBe('home');
    expect(resolveSideById(live, 'sr:competitor:2')).toBe('away');
  });

  it('matches a bare numeric id against a prefixed one', () => {
    expect(resolveSideById(live, '2')).toBe('away');
  });

  it('matches a team code', () => {
    expect(resolveSideById(live, 'LHR')).toBe('home');
  });

  it('matches a team name regardless of case', () => {
    expect(resolveSideById(live, 'lahore qalandars')).toBe('home');
  });

  it('matches the legacy teams array positionally', () => {
    expect(resolveSideById({ teams: ['Lahore', 'Islamabad'] }, 'Lahore')).toBe('home');
    expect(resolveSideById({ teams: ['Lahore', 'Islamabad'] }, 'Islamabad')).toBe('away');
  });

  it('returns null for an id belonging to neither side', () => {
    expect(resolveSideById(live, 'sr:competitor:999')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(resolveSideById(live, '')).toBeNull();
    expect(resolveSideById(live, null)).toBeNull();
  });
});

describe('describeToss', () => {
  it('names the winner and the choice', () => {
    expect(describeToss({ ...live, tossWonBy: 'sr:competitor:1', tossDecision: 'bowl' })).toBe(
      'Lahore Qalandars won the toss and chose to bowl',
    );
  });

  it('handles a bat decision', () => {
    expect(describeToss({ ...live, tossWonBy: 'sr:competitor:2', tossDecision: 'bat' })).toBe(
      'Islamabad United won the toss and chose to bat',
    );
  });

  it('omits the choice when the feed has no decision', () => {
    expect(describeToss({ ...live, tossWonBy: 'sr:competitor:1' })).toBe(
      'Lahore Qalandars won the toss',
    );
  });

  it('returns an empty string when the toss is unknown', () => {
    expect(describeToss(live)).toBe('');
  });

  it('returns an empty string when the winner id cannot be resolved to a side', () => {
    // Showing a raw provider id to a reader would be worse than showing nothing.
    expect(describeToss({ ...live, tossWonBy: 'sr:competitor:999' })).toBe('');
  });
});

describe('tossWinnerName', () => {
  it('returns just the name', () => {
    expect(tossWinnerName({ ...live, tossWonBy: 'sr:competitor:2' })).toBe('Islamabad United');
  });

  it('is empty without a toss', () => {
    expect(tossWinnerName(live)).toBe('');
  });
});

describe('winnerName', () => {
  it('resolves the winning side', () => {
    expect(winnerName({ ...done, winnerId: 'sr:competitor:1' })).toBe('Lahore Qalandars');
  });

  it('is empty when there is no winner, as for an abandoned match', () => {
    expect(winnerName({ ...done, status: 'cancelled' })).toBe('');
  });
});

describe('isDecided', () => {
  it.each(['completed', 'closed', 'ended', 'cancelled', 'canceled', 'abandoned'])(
    'treats %s as decided',
    (status) => expect(isDecided({ status })).toBe(true),
  );

  it.each(['live', 'scheduled', 'upcoming', 'postponed', ''])(
    'treats %s as not decided',
    (status) => expect(isDecided({ status })).toBe(false),
  );
});
describe('describeMargin', () => {
  it('pulls the margin clause out of the stored result', () => {
    expect(describeMargin({ ...done, result: 'Lahore Qalandars won by 30 runs' })).toBe('won by 30 runs');
  });

  it('handles a wickets margin in the result text', () => {
    expect(describeMargin({ ...done, result: 'Islamabad United won by 4 wickets' })).toBe('won by 4 wickets');
  });

  it('pulls a beat margin out too', () => {
    expect(describeMargin({ ...done, result: 'Lahore beat Islamabad by 5 runs' })).toBe('beat Islamabad by 5 runs');
  });

  it('recognises a no-result outcome', () => {
    expect(describeMargin({ ...done, result: 'No result' })).toBe('No result');
  });

  it('never invents a margin from the two final scores', () => {
    // Runs vs wickets depends on who batted first, and two final totals cannot
    // say that: 180/4 vs 150/9 is a valid 30-run win and a valid 1-wicket win.
    expect(describeMargin(done)).toBe('');
  });

  it('is empty when the result text carries no margin clause', () => {
    expect(describeMargin({ ...done, result: 'Match completed' })).toBe('');
  });

  it('is empty when there is no result at all', () => {
    expect(describeMargin(live)).toBe('');
  });
});

describe('periodScoreRows', () => {
  it('reads the period name and score', () => {
    const rows = periodScoreRows({
      periodScores: [
        { name: 'Powerplay', score: '62/2' },
        { name: 'Middle overs', score: '88/1' },
      ],
    });
    expect(rows).toEqual([
      { label: 'Powerplay', value: '62/2' },
      { label: 'Middle overs', value: '88/1' },
    ]);
  });

  it('accepts the snake_case feed shape', () => {
    expect(periodScoreRows({ periodScores: [{ period: 'Overs 1-10', display_score: '60/1' }] })).toEqual([
      { label: 'Overs 1-10', value: '60/1' },
    ]);
  });

  it('labels an unnamed period by position', () => {
    expect(periodScoreRows({ periodScores: [{ score: '10/0' }] })).toEqual([{ label: 'Period 1', value: '10/0' }]);
  });

  it('skips a period with no score rather than showing a blank', () => {
    expect(periodScoreRows({ periodScores: [{ name: 'Powerplay' }] })).toEqual([]);
  });

  it('is empty when there are no periods', () => {
    expect(periodScoreRows(live)).toEqual([]);
  });
});

describe('matchFacts', () => {
  it('shows the toss for a live match and no result rows', () => {
    const facts = matchFacts({ ...live, tossWonBy: 'sr:competitor:1', tossDecision: 'field' });
    expect(facts[0]).toEqual({ label: 'Toss', value: 'Lahore Qalandars won the toss and chose to field' });
    expect(facts.some((f) => f.label === 'Result')).toBe(false);
    expect(facts.some((f) => f.label === 'Winner')).toBe(false);
  });

  it('shows the live innings and overs instead of a result', () => {
    const facts = matchFacts({ ...live, currentInning: 2, displayOvers: '18.3' });
    expect(facts).toEqual(
      expect.arrayContaining([{ label: 'Innings', value: '2' }, { label: 'Overs', value: '18.3' }]),
    );
  });

  it('shows the toss, winner and result for a completed match', () => {
    const facts = matchFacts({
      ...done,
      tossWonBy: 'sr:competitor:1',
      tossDecision: 'bowl',
      winnerId: 'sr:competitor:1',
    });
    expect(facts.map((f) => f.label)).toEqual(expect.arrayContaining(['Toss', 'Winner', 'Result']));
    expect(facts.find((f) => f.label === 'Winner')?.value).toBe('Lahore Qalandars');
  });

  it('never adds a separate Margin row, because the result line carries it', () => {
    const facts = matchFacts({ ...done, result: 'Lahore Qalandars won by 30 runs', winnerId: 'sr:competitor:1' });
    expect(facts.find((f) => f.label === 'Result')?.value).toContain('won by 30 runs');
    expect(facts.some((f) => f.label === 'Margin')).toBe(false);
  });

  it('omits the toss entirely when the feed has none', () => {
    expect(matchFacts(live).some((f) => f.label === 'Toss')).toBe(false);
  });

  it('appends the period split after the other facts', () => {
    const facts = matchFacts({
      ...done,
      winnerId: 'sr:competitor:1',
      periodScores: [{ name: 'PP', score: '60/1' }],
    });
    expect(facts[facts.length - 1]).toEqual({ label: 'PP', value: '60/1' });
  });

  it('never emits an empty value', () => {
    matchFacts({ ...done, tossWonBy: 'sr:competitor:1', periodScores: [{}] }).forEach((f) => {
      expect(f.value.trim().length).toBeGreaterThan(0);
    });
  });

  it('returns nothing for a match with no facts at all', () => {
    expect(matchFacts({ matchId: 'm1', status: 'scheduled' })).toEqual([]);
  });
});