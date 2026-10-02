import { formatCricketOvers, isFurtherAlong, oversToBalls } from '../lib/cricketMath';
import { lastTimelineBall, timelineInningsState } from '../lib/matchTimelineState';

/* ─── Why balls, not numbers ─── */

describe('isFurtherAlong', () => {
  it('treats two spellings of the same ball count as equal, not as progress', () => {
    // This is the whole point. The scorecard renders 174 balls as "29 ov" while
    // Sportradar calls the same state "28.6". A naive number comparison says 29 > 28.6
    // and shows a spurious extra over.
    expect(oversToBalls(29)).toBe(174);
    expect(oversToBalls(28.6)).toBe(174);
    expect(isFurtherAlong(29, 28.6)).toBe(false);
    expect(isFurtherAlong(28.6, 29)).toBe(false);
  });

  it('detects genuine progress measured in balls', () => {
    expect(isFurtherAlong(32.6, 32.4)).toBe(true);
    expect(isFurtherAlong(32.4, 32.6)).toBe(false);
    expect(isFurtherAlong(33.1, 32.6)).toBe(true);
    expect(isFurtherAlong(32.6, 33.1)).toBe(false);
  });

  it('is not fooled by a whole number sitting above a decimal one', () => {
    // 30.6 is 30 overs plus 6 balls, which is exactly 186 balls — the same as 31 ov.
    // So these are the same state, not progress. This is the scorecard-vs-commentary
    // trap: the provider writes "28.6" where a whole-overs field writes "29".
    expect(oversToBalls(30.6)).toBe(186);
    expect(oversToBalls(31)).toBe(186);
    expect(isFurtherAlong(31, 30.6)).toBe(false);
    expect(isFurtherAlong(29, 28.6)).toBe(false);
  });

  it('treats a missing side as "not further", so a good value is never discarded', () => {
    expect(isFurtherAlong(null, 30)).toBe(false);
    expect(isFurtherAlong(30, null)).toBe(true);
    expect(isFurtherAlong(undefined, undefined)).toBe(false);
  });
});

describe('formatCricketOvers', () => {
  it('renders whole overs without a trailing .0', () => {
    expect(formatCricketOvers(29)).toBe('29');
    expect(formatCricketOvers(30)).toBe('30');
  });

  it('normalises a completed sixth ball into the next over', () => {
    // 5 overs and 6 balls IS 6 overs. Every surface normalises the same way, which is
    // what stops the homepage card printing "6 ov" while the match page printed "5.6".
    expect(formatCricketOvers(30.6)).toBe('31');
    expect(formatCricketOvers(28.6)).toBe('29');
    expect(formatCricketOvers(5.6)).toBe('6');
    expect(formatCricketOvers(7.5)).toBe('7.5');
  });
});

/* ─── Reading the timeline ─── */

function payload(overrides: Record<string, unknown> = {}) {
  return {
    sport_event_status: { display_overs: '32.4', display_score: '116/6', run_rate: 3.6 },
    timeline: [
      {
        id: 1,
        type: 'ball',
        inning: 2,
        over_number: 32,
        ball_number: 5,
        display_overs: '31.5',
        display_score: '116/6',
        time: '2026-09-30T13:11:00+00:00',
      },
      {
        id: 2,
        type: 'ball',
        inning: 2,
        over_number: 32,
        ball_number: 6,
        display_overs: '32.4',
        display_score: '116/6',
        time: '2026-09-30T13:11:24+00:00',
      },
    ],
    ...overrides,
  };
}

describe('lastTimelineBall', () => {
  it('returns the final ball event', () => {
    expect(lastTimelineBall(payload())?.id).toBe(2);
  });

  it('skips non-ball entries at the tail', () => {
    const withPenalty = payload({
      timeline: [...payload().timeline, { id: 3, type: 'timeout' }],
    });
    expect(lastTimelineBall(withPenalty)?.id).toBe(2);
  });

  it('copes with an empty or malformed payload', () => {
    expect(lastTimelineBall(null)).toBeNull();
    expect(lastTimelineBall({})).toBeNull();
    expect(lastTimelineBall({ timeline: [] })).toBeNull();
    expect(lastTimelineBall({ timeline: 'nope' })).toBeNull();
  });
});

describe('timelineInningsState', () => {
  it('reads the score and overs the payload reports', () => {
    const state = timelineInningsState(payload());
    expect(state.overs).toBe(32.4);
    expect(state.score).toBe('116/6');
    expect(state.runs).toBe(116);
  });

  it('prefers whichever source is further along', () => {
    // The status block can lag the last ball by a delivery; the two must not disagree.
    const ahead = timelineInningsState(
      payload({
        sport_event_status: { display_overs: '32.4', display_score: '116/6' },
        timeline: [
          { id: 1, type: 'ball', display_overs: '32.6', display_score: '121/6', time: '2026-09-30T13:12:39+00:00' },
        ],
      }),
    );
    expect(ahead.overs).toBe(32.6);
    expect(ahead.score).toBe('121/6');
    expect(ahead.runs).toBe(121);
  });

  it('prefers the status block when it is ahead of the last ball', () => {
    const ahead = timelineInningsState(
      payload({
        sport_event_status: { display_overs: '33.2', display_score: '130/4' },
        timeline: [{ id: 1, type: 'ball', display_overs: '33.1', display_score: '129/4' }],
      }),
    );
    expect(ahead.overs).toBe(33.2);
    expect(ahead.score).toBe('130/4');
  });

  it('reports the ball time, which is what makes staleness visible', () => {
    expect(timelineInningsState(payload()).time).toBe('2026-09-30T13:11:24+00:00');
  });

  it('returns nulls rather than throwing on an empty payload', () => {
    const state = timelineInningsState(null);
    expect(state.overs).toBeNull();
    expect(state.runs).toBeNull();
    expect(state.score).toBeNull();
  });

  it('does not treat a lower score in a new innings as progress', () => {
    // Overs restart at 0 for the second innings, so comparing raw overs across
    // innings would wrongly call the new innings "behind".
    const secondInnings = payload({
      sport_event_status: { display_overs: '0.3', display_score: '4/0', current_inning: 2 },
      timeline: [{ id: 9, type: 'ball', inning: 2, display_overs: '0.3', display_score: '4/0' }],
    });
    expect(timelineInningsState(secondInnings).score).toBe('4/0');
  });
});