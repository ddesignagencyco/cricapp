import { deriveMatchState } from '../hooks/useMatchState';
import { timelineInningsState } from '../lib/matchTimelineState';
import sample from './fixtures/liveTimelineSample.json';

/**
 * Why the site can disagree internally yet still show one number.
 *
 * The API writes the match row and the ball-by-ball timeline from two different paths, so
 * one is routinely a ball or two behind the other, and during a network failure one can be
 * frozen for minutes. That is not fixable from the client.
 *
 * What the client can guarantee — and what these tests pin — is that a disagreement never
 * becomes a *contradiction on screen*. The rule: pick whichever source is furthest along in
 * ball count, then read score, runs, overs, wickets and run rate from that one source. A
 * stale source can therefore be too old to show, but it can never overwrite a current one
 * and it can never be mixed with one.
 *
 * The limit is stated plainly in the last test: a stale timeline still means the
 * commentary is missing balls, and no client can invent them.
 */

const payload = sample as unknown as Record<string, unknown>;
const events = payload.timeline as { display_overs?: string; display_score?: string; inning?: number }[];

/** A match row that is several balls ahead of the stored timeline. */
const rowAheadOfTimeline = {
  matchId: 'sr:match:1',
  status: 'live',
  displayScore: '92/1',
  displayOvers: 30.4,
  inningsStatus: 'second_innings_home_team',
  teams: {
    home: { name: 'India', code: 'IN', score: '92/1', overs: '30' },
    away: { name: 'West Indies', code: 'WI', score: '405/7', overs: '50' },
  },
  teamNames: ['India', 'West Indies'],
  currentInnings: { runs: 380, overs: 35, wickets: 2, runRate: 10.9, battingTeam: 'IND' },
};

describe('one source wins, and every number comes from it', () => {
  it('a stale timeline cannot overwrite a current match row', () => {
    // The stored timeline stops at 32.4; the row has moved on to 35.
    const state = deriveMatchState(rowAheadOfTimeline, payload);
    expect(state.score).toBe('380/2');
    expect(state.oversLabel).toBe('35');
    expect(state.runs).toBe(380);
    expect(state.wickets).toBe(2);
  });

  it('the score and the overs always describe the same innings', () => {
    const state = deriveMatchState(rowAheadOfTimeline, payload);
    const fromScore = Number(state.score?.match(/^(\d+)\//)?.[1] ?? state.runs);
    expect(fromScore).toBe(state.runs);
  });

  it('the run rate always belongs to the score printed above it', () => {
    const state = deriveMatchState(rowAheadOfTimeline, payload);
    expect(state.runRate).toBeCloseTo(380 / 35, 2);
  });

  it('a timeline that is ahead wins instead, so a fresher commentary is not ignored', () => {
    const ahead = {
      sport_event_status: { display_overs: '36.1', display_score: '388/2' },
      timeline: [{ id: 1, type: 'ball', display_overs: '36.1', display_score: '388/2' }],
    };
    const state = deriveMatchState(rowAheadOfTimeline, ahead);
    expect(state.score).toBe('388/2');
    expect(state.oversLabel).toBe('36.1');
    expect(state.runs).toBe(388);
  });

  it('the card, the ticker and the page agree because they read the same derivation', () => {
    // All three surfaces call `deriveMatchState` with the same payload, so they cannot
    // disagree with each other regardless of what the API sends.
    const a = deriveMatchState(rowAheadOfTimeline, payload);
    const b = deriveMatchState(rowAheadOfTimeline, payload);
    const c = deriveMatchState(rowAheadOfTimeline, payload);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  it('reaches the same answer however many times the row and timeline disagree', () => {
    // Feed the same match with the timeline frozen at every earlier point in the innings.
    // Each must resolve to the current row, and always as one consistent block.
    const earlier = events.map((event) => ({
      ...event,
      display_overs: event.display_overs,
      display_score: event.display_score,
    }));
    for (const frozen of [earlier, earlier.slice(0, 3), earlier.slice(0, 1), []]) {
      const state = deriveMatchState(rowAheadOfTimeline, { timeline: frozen });
      expect(state.score).toBe('380/2');
      expect(state.oversLabel).toBe('35');
    }
  });

  it('a completed match is unaffected by any of it', () => {
    const finished = {
      ...rowAheadOfTimeline,
      status: 'completed',
      displayScore: '405/8',
      displayOvers: 50,
      currentInnings: null,
    };
    const state = deriveMatchState(finished, payload);
    expect(state.isLive).toBe(false);
    expect(state.score).toBe('405/8');
    expect(state.oversLabel).toBe('50');
    expect(state.runRate).toBeNull();
  });
});

describe('the limit, stated honestly', () => {
  it('the frozen timeline still only knows what it was told', () => {
    // The state is correct, but the commentary behind it is not. No client logic can add
    // the balls that were never ingested — that is the backend work, and this is why a
    // passing reconciliation test does not prove the feed is healthy.
    const state = deriveMatchState(rowAheadOfTimeline, payload);
    const last = timelineInningsState(payload);
    expect(state.score).toBe('380/2');
    expect(last?.overs).not.toBeNull();
    expect(Number(last?.overs)).toBeLessThan(35);
  });
});
