import {
  timelineInningsState,
  lastTimelineBall,
  mergeTimelineDelta,
} from '../lib/matchTimelineState';
import { deriveMatchState } from '../lib/deriveMatchState';

/**
 * Regression cover for "the header and the commentary disagree about the same match".
 *
 * `matchTimelineState` read `payload.timeline` / `payload.sport_event_status` directly
 * while every other reader unwrapped first. On the wrapped payload that
 * `GET /matches/:id/timeline` actually returns, the timeline contributed nothing and the
 * header fell back to the lagging match row.
 */

const STATUS = { display_score: '63/1', display_overs: '5.3' };
const LAST_BALL = { type: 'ball', display_score: '63/1', display_overs: '5.3', time: '18:20:00' };
const EARLIER_BALL = { type: 'ball', display_score: '58/1', display_overs: '4.2' };

/** The three envelopes the provider/API produce, all carrying identical content. */
const SHAPES: Array<[string, Record<string, unknown>]> = [
  ['bare', { sport_event_status: STATUS, timeline: [EARLIER_BALL, LAST_BALL] }],
  ['payload-nested', { payload: { sport_event_status: STATUS, timeline: [EARLIER_BALL, LAST_BALL] } }],
  [
    'sport_event_timeline-nested',
    { sport_event_timeline: { sport_event_status: STATUS, timeline: [EARLIER_BALL, LAST_BALL] } },
  ],
];

describe('timeline payload envelopes', () => {
  it.each(SHAPES)('reads the last ball from a %s payload', (_name, payload) => {
    expect(lastTimelineBall(payload)?.display_score).toBe('63/1');
  });

  it.each(SHAPES)('resolves the innings state from a %s payload', (_name, payload) => {
    const state = timelineInningsState(payload);
    expect(state.runs).toBe(63);
    expect(state.oversLabel).toBe('5.3');
  });

  it('falls back to the status block when the payload carries no events', () => {
    // Legitimate: `sport_event_status` is a valid source on its own, and reading it is
    // what keeps the header honest before the first ball event arrives.
    const state = timelineInningsState({ sport_event_status: STATUS });
    expect(state.runs).toBe(63);
    expect(state.oversLabel).toBe('5.3');
  });

  it('reads nothing when there is nothing to read', () => {
    // An all-null state, not `null`: `deriveMatchState` guards with `isFurtherAlong`,
    // which is false for a null overs, so an unreadable timeline is ignored rather than
    // allowed to blank a real score.
    for (const state of [timelineInningsState(null), timelineInningsState({})]) {
      expect(state?.runs).toBeNull();
      expect(state?.overs).toBeNull();
    }
    expect(lastTimelineBall(undefined)).toBeNull();
    expect(lastTimelineBall({ sport_event_status: STATUS })).toBeNull();

    // And the guard that consumes it.
    const row = { status: 'live', displayScore: '58/1', currentInnings: { runs: 58, overs: '4.2', wickets: 1 } };
    expect(deriveMatchState(row, null).runs).toBe(58);
  });
});

describe('the match row may not outvote a timeline that is ahead', () => {
  /**
   * The reported case: the row still said 58/1 at 4.2 overs while the timeline had
   * already reached 63/1 at 5.3. The row is behind in balls, so its runs cannot be the
   * current total, and the header used to print them anyway.
   */
  const staleRow = {
    status: 'live',
    displayScore: '58/1',
    displayOvers: '4.2',
    currentInnings: { runs: 58, overs: '4.2', wickets: 1, battingTeam: 'WI' },
    teams: { home: { code: 'ZIM', score: '106/7' }, away: { code: 'WI', score: '58/1' } },
  };

  it('follows the timeline overs when the row is behind', () => {
    const state = deriveMatchState(staleRow, SHAPES[2][1]);
    expect(state.oversLabel).toBe('5.3');
  });

  it('keeps the row runs only when the timeline cannot supply any', () => {
    // No `display_score` anywhere in the timeline: overs come from the timeline, runs
    // fall back to the row, and the score string is rebuilt so it cannot contradict.
    const unreadable = {
      sport_event_timeline: {
        sport_event_status: { display_overs: '5.3' },
        timeline: [{ type: 'ball', display_overs: '5.3' }],
      },
    };
    const state = deriveMatchState(staleRow, unreadable);
    expect(state.oversLabel).toBe('5.3');
    expect(state.runs).toBe(58);
    expect(state.score).toBe('58/1');
  });

  it('reads the timeline outright when it is complete', () => {
    const state = deriveMatchState(staleRow, SHAPES[0][1]);
    expect(state.runs).toBe(63);
    expect(state.wickets).toBe(1);
    expect(state.oversLabel).toBe('5.3');
    expect(state.score).toBe('63/1');
  });

  it('still prefers the row once it is the further-along source', () => {
    const aheadRow = {
      ...staleRow,
      displayScore: '70/2',
      displayOvers: '6.4',
      currentInnings: { runs: 70, overs: '6.4', wickets: 2, battingTeam: 'WI' },
    };
    const state = deriveMatchState(aheadRow, SHAPES[0][1]);
    expect(state.runs).toBe(70);
    expect(state.oversLabel).toBe('6.4');
  });

  it('never lets the score string contradict the runs beside it', () => {
    const state = deriveMatchState(staleRow, SHAPES[2][1]);
    const scoreRuns = Number(String(state.score).split('/')[0]);
    expect(scoreRuns).toBe(state.runs);
  });
});

/**
 * `GET /matches/:id/timeline?since=<rev>` answers with the whole envelope but only the
 * events newer than `rev`, flagged `complete: false`. Splicing those has to leave a
 * payload indistinguishable from a full one, or the commentary list restarts from one ball
 * on every poll.
 */
describe('mergeTimelineDelta', () => {
  const ball = (id: number, overs: string) => ({ id, type: 'ball', display_overs: overs });

  function eventsOf(timeline: { payload: Record<string, unknown> }): unknown[] {
    const inner = timeline.payload as { sport_event_timeline: { timeline: unknown[] } };
    return inner.sport_event_timeline.timeline;
  }

  const base = {
    matchId: 'm1',
    revision: 100,
    updatedAt: '2026-10-05T12:00:00.000Z',
    complete: true,
    payload: {
      coverage: { type: 'sport_event' },
      sport_event_status: { display_score: '50/1', display_overs: '5.0' },
      sport_event_timeline: { timeline: [ball(1, '1.0'), ball(2, '2.0')] },
    },
  };

  it('appends the delta onto the cached events instead of replacing them', () => {
    const delta = {
      matchId: 'm1',
      revision: 103,
      complete: false,
      payload: {
        coverage: { type: 'sport_event' },
        sport_event_status: { display_score: '53/1', display_overs: '3.0' },
        sport_event_timeline: { timeline: [ball(3, '3.0')] },
      },
    };
    const merged = mergeTimelineDelta(base, delta);
    expect(eventsOf(merged)).toHaveLength(3);
    expect(merged.revision).toBe(103);
    // Non-event blocks come from the delta: it is a fresh full snapshot of everything else.
    expect(merged.payload).toMatchObject({
      sport_event_status: { display_score: '53/1', display_overs: '3.0' },
      coverage: { type: 'sport_event' },
    });
  });

  it('leaves the merged payload readable by the state readers', () => {
    const delta = {
      matchId: 'm1',
      revision: 104,
      complete: false,
      payload: {
        sport_event_status: { display_score: '53/1', display_overs: '3.0' },
        sport_event_timeline: {
          timeline: [ball(3, '3.0'), ball(4, '3.6')],
        },
      },
    };
    const merged = mergeTimelineDelta(base, delta);
    expect(lastTimelineBall(merged.payload)?.display_overs).toBe('3.6');
    expect(timelineInningsState(merged.payload)?.overs).toBe(3.6);
  });

  it('drops a redelivered event rather than rendering it twice', () => {
    // The provider rewrites the tail of the timeline on each sync, so an event already
    // held can reappear inside the delta.
    const delta = {
      matchId: 'm1',
      revision: 103,
      complete: false,
      payload: { sport_event_timeline: { timeline: [ball(2, '2.0'), ball(3, '3.0')] } },
    };
    const merged = mergeTimelineDelta(base, delta);
    expect(eventsOf(merged)).toHaveLength(3);
  });

  it('keeps the cached events when the delta carries none', () => {
    const delta = {
      matchId: 'm1',
      revision: 100,
      complete: false,
      payload: { sport_event_timeline: { timeline: [] } },
    };
    const merged = mergeTimelineDelta(base, delta);
    expect(eventsOf(merged)).toHaveLength(2);
  });

  it('replaces the cached value outright for a complete payload', () => {
    const full = { ...base, revision: 200 };
    const merged = mergeTimelineDelta(base, full);
    expect(merged).toBe(full);
  });

  it('takes the first full payload when nothing is cached yet', () => {
    const delta = {
      matchId: 'm1',
      revision: 101,
      complete: false,
      payload: { sport_event_timeline: { timeline: [ball(1, '1.0')] } },
    };
    expect(mergeTimelineDelta(null, delta)).toBe(delta);
  });
});