import { deriveMatchState } from '../hooks/useMatchState';
import { buildMatchScoreboard } from '../lib/matchScoreboard';
import { currentRunRate, formatRate } from '../lib/cricketMath';

/**
 * The run rate was the last field still being read straight from storage.
 *
 * `currentInnings.runRate` is written by a separate path from `currentInnings.runs` and
 * `.overs`, and it lags them. A live response was seen carrying:
 *
 *   runs: 314   overs: 30.4   runRate: 10.18
 *
 * where 314 from 30.4 overs is 10.35. The page printed that stale 10.18 directly under a
 * reconciled score, so the run rate contradicted the line above it — the visible symptom
 * being a card reading "306/1 · 30.1 ov · RR 10.14" while the match page read
 * "307/1 · 30.2 ov · RR 10.14" at the same moment.
 *
 * Rule: the run rate is computed from the runs and overs printed beside it, and the
 * stored value is only a fallback for when runs or overs are missing.
 */

function liveMatch(overrides: Record<string, unknown> = {}) {
  return {
    matchId: 'sr:match:1',
    status: 'live',
    displayScore: '306/1',
    displayOvers: 30.1,
    inningsStatus: 'second_innings_home_team',
    teams: {
      home: { name: 'India', code: 'IN', score: '306/1', overs: '30' },
      away: { name: 'West Indies', code: 'WI', score: '405/7', overs: '50' },
    },
    teamNames: ['India', 'West Indies'],
    currentInnings: { runs: 306, overs: 30.1, wickets: 1, runRate: 10.14, battingTeam: 'IND' },
    ...overrides,
  };
}

describe('the run rate belongs to the score printed above it', () => {
  it('ignores a stored run rate that disagrees with its own runs and overs', () => {
    const match = liveMatch({
      currentInnings: { runs: 314, overs: 30.4, wickets: 1, runRate: 10.18, battingTeam: 'IND' },
    });
    const state = deriveMatchState(match);
    const expected = currentRunRate(state.runs ?? 0, Number(state.oversLabel));

    expect(state.runRate).toBe(expected);
    expect(state.runRate).not.toBe(10.18);
  });

  it('the scorecard run rate matches the score and overs beside it', () => {
    const match = liveMatch();
    const state = deriveMatchState(match);
    const board = buildMatchScoreboard({
      home: { code: 'IN', name: 'India', raw: 'IN', score: '306/1', overs: '30' },
      away: { code: 'WI', name: 'West Indies', raw: 'WI', score: '405/7', overs: '50' },
      battingTeam: 'IND',
      matchStatus: 'second_innings_home_team',
      innRuns: state.runs ?? undefined,
      innWkts: state.wickets ?? undefined,
      innOvers: Number(state.oversLabel),
      innRr: 99.99,
      displayScore: state.score ?? undefined,
      live: true,
    });

    // A deliberately absurd stored rate must not reach the page.
    expect(board.rrLabel).toBe(formatRate(currentRunRate(state.runs ?? 0, Number(state.oversLabel))));
    expect(board.rrLabel).not.toContain('99.99');
  });

  it('stays consistent when the timeline is the winning source', () => {
    const match = liveMatch({
      displayScore: '306/1',
      displayOvers: 30.1,
      currentInnings: { runs: 306, overs: 30.1, wickets: 1, runRate: 10.14, battingTeam: 'IND' },
    });
    const timeline = {
      sport_event_status: { display_overs: '30.2', display_score: '307/1' },
      timeline: [{ id: 1, type: 'ball', display_overs: '30.2', display_score: '307/1' }],
    };
    const state = deriveMatchState(match, timeline);

    expect(state.score).toBe('307/1');
    expect(state.oversLabel).toBe('30.2');
    expect(state.runRate).toBe(currentRunRate(307, 30.2));
  });

  it('falls back to the stored rate only when runs or overs are unknown', () => {
    const state = deriveMatchState(
      liveMatch({ displayScore: null, displayOvers: null, currentInnings: { battingTeam: 'IND', runRate: 8.5 } }),
    );
    expect(state.runRate).toBe(8.5);
  });

  it('has no run rate for a finished match', () => {
    const state = deriveMatchState(
      liveMatch({ status: 'completed', displayScore: '405/8', displayOvers: 50, currentInnings: null }),
    );
    expect(state.runRate).toBeNull();
  });
});
