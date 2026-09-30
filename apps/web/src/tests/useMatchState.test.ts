import { deriveMatchState } from '../hooks/useMatchState';
import { formatCricketOvers } from '../lib/cricketMath';

/**
 * The site used to show one live match three different ways: the match page header read
 * the match row, the commentary read the timeline, and the homepage card re-derived it
 * from the socket payload. Because the match row and the timeline are written by
 * different backend paths they can be a ball or two apart, so the same match showed
 * "6 ov" on the homepage and "6.4" on its own page.
 *
 * `deriveMatchState` is the one place that decides. These tests pin the two rules that
 * make it agree with itself: one winner chosen in balls, and one spelling.
 */

function match(overrides: Record<string, unknown> = {}) {
  return {
    matchId: 'sr:match:1',
    status: 'live',
    displayScore: '51/0',
    displayOvers: 6.4,
    currentInnings: { runs: 51, overs: 6.4, wickets: 0, runRate: 7.65, battingTeam: 'IND' },
    ...overrides,
  };
}

function timeline(lastOvers: string, lastScore: string, statusOvers?: string, statusScore?: string) {
  return {
    sport_event_status: {
      display_overs: statusOvers ?? lastOvers,
      display_score: statusScore ?? lastScore,
    },
    timeline: [
      { id: 1, type: 'ball', display_overs: lastOvers, display_score: lastScore, time: '2026-09-30T13:40:00+00:00' },
    ],
  };
}

describe('the single match state', () => {
  it('reads the live innings straight off the match row', () => {
    const state = deriveMatchState(match());
    expect(state.runs).toBe(51);
    expect(state.oversLabel).toBe('6.4');
    expect(state.isLive).toBe(true);
    expect(state.battingTeam).toBe('IND');
  });

it('lets the timeline win when it is further along in balls', () => {
    const behind = match();
    const state = deriveMatchState(behind, timeline('6.6', '56/0', '6.4', '51/0'));
    // 6 overs and 6 balls is 7 overs — normalised, exactly like every other surface.
    expect(state.oversLabel).toBe('7');
    expect(state.score).toBe('56/0');
    expect(state.runs).toBe(56);
  });

  it('keeps the match row when the timeline is behind', () => {
    const ahead = match({
      displayScore: '66/0',
      displayOvers: 7.1,
      currentInnings: { runs: 66, overs: 7.1, wickets: 0 },
    });
    const state = deriveMatchState(ahead, timeline('6.6', '56/0'));
    expect(state.oversLabel).toBe('7.1');
    expect(state.score).toBe('66/0');
  });

  it('treats two spellings of the same ball count as equal, not as progress', () => {
    // 29 ov and 28.6 are both 174 balls. A raw number comparison would call 29 "later"
    // and put a spurious over in front of the reader.
    const row = match({ displayOvers: 29, currentInnings: { runs: 174, overs: 29, wickets: 0 } });
    const state = deriveMatchState(row, timeline('28.6', '174/2'));
    expect(state.oversLabel).toBe('29');
  });

  it('normalises a completed sixth ball, so every surface prints the same string', () => {
    // Five overs and six balls is six overs. This is the rule that stops the homepage
    // showing "6 ov" while the match page showed "5.6".
    const state = deriveMatchState(
      match({ displayOvers: 5.6, currentInnings: { runs: 33, overs: 5.6, wickets: 0 } }),
    );
    expect(state.oversLabel).toBe('6');
    expect(state.oversLabel).toBe(formatCricketOvers(5.6));
  });

  it('ignores the timeline for a completed match', () => {
    // A stale live payload must never overwrite a finished innings, and
    // `currentInnings` still holds the last thing seen mid-match.
    const finished = match({
      status: 'completed',
      displayScore: '271/5',
      displayOvers: 50,
      currentInnings: null,
    });
    const state = deriveMatchState(finished, timeline('31.5', '113/6'));
    expect(state.isLive).toBe(false);
    expect(state.oversLabel).toBe('50');
    expect(state.score).toBe('271/5');
  });

  it('produces the same label whichever surface asks', () => {
    // The whole point: two surfaces, same inputs, one string.
    const row = match();
    const tl = timeline('6.4', '51/0');
    const fromRow = deriveMatchState(row).oversLabel;
    const fromTimeline = deriveMatchState(row, tl).oversLabel;
    expect(fromRow).toBe(fromTimeline);
  });

  it('handles a match with nothing to show', () => {
    const state = deriveMatchState(null);
    expect(state.oversLabel).toBe('');
    expect(state.runs).toBeNull();
    expect(state.isLive).toBe(false);
  });

  it('does not invent an overs value when there is no innings', () => {
    const upcoming = match({ status: 'upcoming', currentInnings: null, displayOvers: null, displayScore: null });
    const state = deriveMatchState(upcoming);
    expect(state.oversLabel).toBe('');
    expect(state.isLive).toBe(false);
  });
});