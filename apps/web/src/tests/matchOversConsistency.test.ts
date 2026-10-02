import { buildMatchScoreboard } from '../lib/matchScoreboard';
import { deriveMatchState } from '../hooks/useMatchState';
import { formatCricketOvers, isFurtherAlong } from '../lib/cricketMath';
import { timelineInningsState } from '../lib/matchTimelineState';

/**
 * The regression suite for "the same match shows two different overs".
 *
 * Observed on a live ODI: the header read `9.5 ov` while the "Overs" stat below it read
 * `9.4 ov`, and the homepage card read `9 ov` after the score had already moved on.
 * Each panel was deriving its own value from a different field, so any disagreement
 * between the match row and the timeline became visible.
 *
 * The invariant asserted throughout: **one match, one overs string.** Every panel must
 * print the value produced by `formatCricketOvers`, chosen from whichever source is
 * further along in balls.
 */

function row(overrides: Record<string, unknown> = {}) {
  return {
    matchId: 'sr:match:1',
    status: 'live',
    displayScore: '92/0',
    displayOvers: 9.4,
    teams: {
      home: { name: 'India', code: 'IN', score: '92/0', overs: '9' },
      away: { name: 'West Indies', code: 'WI', score: '405/7', overs: '50' },
    },
    teamScores: {
      home: { name: 'India', code: 'IN', score: '92/0', overs: '9' },
      away: { name: 'West Indies', code: 'WI', score: '405/7', overs: '50' },
    },
    teamNames: ['India', 'West Indies'],
    currentInnings: { runs: 92, overs: 9.4, wickets: 0, runRate: 9.36, battingTeam: 'IND' },
    ...overrides,
  };
}

function timeline(lastOvers: string, lastScore: string, statusOvers = lastOvers, statusScore = lastScore) {
  return {
    sport_event_status: { display_overs: statusOvers, display_score: statusScore },
    timeline: [{ id: 1, type: 'ball', display_overs: lastOvers, display_score: lastScore }],
  };
}

describe('one match, one overs string', () => {
  it('shows the same overs on every panel when the sources agree', () => {
    const match = row();
    const tl = timeline('9.4', '92/0');

    const state = deriveMatchState(match, tl);
    const board = buildMatchScoreboard({
      home: { ...match.teams.home, raw: 'IN', score: '92/0', overs: '9' },
      away: { ...match.teams.away, raw: 'WI', score: '405/7', overs: '50' },
      battingTeam: 'IND',
      matchStatus: 'second_innings_home_team',
      innRuns: state.runs ?? undefined,
      innWkts: 0,
      innOvers: Number(state.oversLabel),
      innRr: 9.36,
      displayScore: state.score ?? undefined,
      live: true,
    });

    // The header reads `board.oversLabel` and the "Overs" stat reads the same value.
    // This is the assertion that failed on the live bug.
    expect(board.oversLabel).toBe(state.oversLabel);
    expect(state.oversLabel).toBe(formatCricketOvers(9.4));
  });

  it('does not let the rounded team field override the live innings', () => {
    // `teams.home.overs` is the whole-overs "9", which is a different ball count from
    // 9 overs and 4 balls. The live innings must win.
    const match = row();
    const state = deriveMatchState(match, timeline('9.4', '92/0'));
    expect(state.oversLabel).toBe('9.4');
    expect(String(match.teams.home.overs)).toBe('9');
  });

  it('moves to the timeline value when the timeline is genuinely further along', () => {
    // This is the second half of the live bug: header 9.5, stat 9.4.
    const behind = row();
    const state = deriveMatchState(behind, timeline('9.5', '98/0', '9.4', '92/0'));

    expect(isFurtherAlong(9.5, 9.4)).toBe(true);
    expect(state.oversLabel).toBe(formatCricketOvers(9.5));
    expect(state.oversLabel).toBe('9.5');
    expect(state.score).toBe('98/0');
  });

  it('keeps the match row when the timeline is behind, never oscillating', () => {
    const ahead = row();
    const state = deriveMatchState(ahead, timeline('9.1', '85/0'));
    expect(state.oversLabel).toBe('9.4');
    // Feeding the reconciled value back in must not move it again.
    expect(deriveMatchState(ahead, timeline(state.oversLabel, state.score ?? '92/0')).oversLabel).toBe(
      state.oversLabel,
    );
  });

  it('agrees with the commentary it sits above', () => {
    // The stat and the last ball line are the two things a reader compares directly.
    const match = row();
    const tl = timeline('9.5', '98/0', '9.4', '92/0');
    const state = deriveMatchState(match, tl);
    const lastBall = timelineInningsState(tl);
    expect(state.oversLabel).toBe(formatCricketOvers(lastBall.overs));
  });

  it('normalises so a completed over never shows as 5.6 anywhere', () => {
    const state = deriveMatchState(
      row({ displayOvers: 5.6, currentInnings: { runs: 33, overs: 5.6, wickets: 0, battingTeam: 'IND' } }),
      timeline('5.6', '33/0'),
    );
    expect(state.oversLabel).toBe('6');
    expect(state.oversLabel).not.toBe('5.6');
  });

  it('leaves a finished match alone', () => {
    const finished = row({
      status: 'completed',
      displayScore: '405/8',
      displayOvers: 50,
      currentInnings: null,
    });
    const state = deriveMatchState(finished, timeline('9.4', '92/0'));
    expect(state.oversLabel).toBe('50');
    expect(state.score).toBe('405/8');
  });

  it('never produces a value a second surface would print differently', () => {
    // Exhaustive: for a spread of live states, every surface's derivation agrees.
    const states = [9.4, 9.5, 9.6, 10, 5.6, 0.2, 42, 41.6];
    states.forEach((overs) => {
      const match = row({
        displayOvers: overs,
        currentInnings: { runs: 100, overs, wickets: 2, battingTeam: 'IND' },
      });
      const fromRow = deriveMatchState(match).oversLabel;
      const fromTimeline = deriveMatchState(match, timeline(formatCricketOvers(overs), '100/2')).oversLabel;
      expect(fromRow).toBe(formatCricketOvers(overs));
      expect(fromTimeline).toBe(fromRow);
    });
  });
});