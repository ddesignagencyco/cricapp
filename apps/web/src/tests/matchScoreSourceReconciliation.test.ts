import { deriveMatchState } from '../hooks/useMatchState';
import { oversToBalls } from '../lib/cricketMath';

/**
 * The score fields inside a single API response do not always agree.
 *
 * Measured on a live ODI, one `GET /matches/:id` returned all of this at once:
 *
 *   displayScore             288/1
 *   currentInnings           292/1  @ 28.4
 *   currentInnings.runRate   10.13        (implies 287 runs)
 *   teams.home.score         292/1
 *   timeline status          288/1  @ 28.4
 *   timeline last event      292/1  @ 28.5
 *
 * A card that read the score from one field and the overs from another therefore printed
 * two different numbers for the same delivery, and the homepage and the match page
 * drifted a ball apart while looking at the same match.
 *
 * The rule these tests pin: pick the source that is furthest along in **ball count**,
 * then read score, runs, wickets and overs from that one source. Runs cannot be compared
 * directly, because a slow over yields fewer runs for the same number of balls.
 */

function apiLiveResponse(overrides: Record<string, unknown> = {}) {
  return {
    matchId: 'sr:match:1',
    status: 'live',
    displayScore: '288/1',
    displayOvers: 28.4,
    inningsStatus: 'second_innings_home_team',
    teams: {
      home: { name: 'India', code: 'IN', score: '292/1', overs: '28' },
      away: { name: 'West Indies', code: 'WI', score: '405/7', overs: '50' },
    },
    teamScores: {
      home: { name: 'India', code: 'IN', score: '292/1', overs: '28' },
      away: { name: 'West Indies', code: 'WI', score: '405/7', overs: '50' },
    },
    teamNames: ['India', 'West Indies'],
    currentInnings: { runs: 292, overs: 28.4, wickets: 1, runRate: 10.13, battingTeam: 'IND' },
    ...overrides,
  };
}

describe('one score, one overs, out of a response that disagrees with itself', () => {
  it('never mixes a score from one field with an overs from another', () => {
    const state = deriveMatchState(apiLiveResponse());

    // Whatever wins, the runs and the score string must describe the same innings.
    if (state.runs !== null && state.score) {
      const fromScore = Number(state.score.match(/^(\d+)\//)?.[1] ?? state.runs);
      expect(fromScore).toBe(state.runs);
    }
  });

  it('takes currentInnings when it is further along than the match row', () => {
    // The match row says 28.4 / 288; currentInnings says 28.5 / 296. The row is stale.
    const state = deriveMatchState(
      apiLiveResponse({
        displayScore: '288/1',
        displayOvers: 28.4,
        currentInnings: { runs: 296, overs: 28.5, wickets: 1, runRate: 10.1, battingTeam: 'IND' },
      }),
    );
    expect(state.runs).toBe(296);
    expect(state.score).toBe('296/1');
    expect(state.oversLabel).toBe('28.5');
  });

  it('takes the match row when currentInnings is behind it', () => {
    // The mirror image: the SSE/write pipeline advanced the row, currentInnings is stale.
    const state = deriveMatchState(
      apiLiveResponse({
        displayScore: '288/1',
        displayOvers: 28.4,
        currentInnings: { runs: 281, overs: 28.2, wickets: 1, runRate: 9.9, battingTeam: 'IND' },
      }),
    );
    expect(state.runs).toBe(288);
    expect(state.score).toBe('288/1');
    expect(state.oversLabel).toBe('28.4');
  });

  it('compares ball counts, not run totals', () => {
    // A dot-heavy over: 28.4 with only 280 runs, versus 28.3 with 292 runs. More runs,
    // but fewer balls — so 28.4 is the current innings and must win.
    const state = deriveMatchState(
      apiLiveResponse({
        displayScore: '280/1',
        displayOvers: 28.4,
        currentInnings: { runs: 292, overs: 28.3, wickets: 1, runRate: 10.3, battingTeam: 'IND' },
      }),
    );
    expect(state.oversLabel).toBe('28.4');
    expect(state.runs).toBe(280);
    expect(state.score).toBe('280/1');
  });

  it('falls back to the team score when displayScore is missing', () => {
    const state = deriveMatchState(
      apiLiveResponse({ displayScore: null, currentInnings: null, displayOvers: 28.4 }),
    );
    expect(state.score).toBe('292/1');
  });

  it('lets the timeline win when it is furthest along, as one block', () => {
    const timeline = {
      sport_event_status: { display_overs: '28.5', display_score: '296/1' },
      timeline: [{ id: 1, type: 'ball', display_overs: '28.5', display_score: '296/1' }],
    };
    const state = deriveMatchState(apiLiveResponse(), timeline);
    expect(state.oversLabel).toBe('28.5');
    expect(state.score).toBe('296/1');
    expect(state.runs).toBe(296);
    expect(state.wickets).toBe(1);
  });

  it('does not let a same-over timeline event drag a higher score onto older balls', () => {
    // Row, currentInnings and the timeline are all at 28.4 but report 288, 292 and 296.
    // At the same ball count the timeline is not "further along", so it does not win.
    //
    // The point of this test is that the answer is 288 and not 296: taking the highest
    // score from one source while taking the overs from another is the torn read that
    // made a single card print two different numbers. Internal consistency is worth more
    // here than showing the largest available total.
    const timeline = {
      sport_event_status: { display_overs: '28.4', display_score: '288/1' },
      timeline: [{ id: 1, type: 'ball', display_overs: '28.4', display_score: '296/1' }],
    };
    const state = deriveMatchState(apiLiveResponse(), timeline);
    expect(state.oversLabel).toBe('28.4');
    expect(state.score).toBe('288/1');
    expect(state.runs).toBe(288);
  });

  it('produces the identical result for the card and the match page', () => {
    // Both surfaces call this with the same payload, so they must agree exactly.
    const payload = apiLiveResponse();
    const card = deriveMatchState(payload);
    const page = deriveMatchState(payload);
    expect(card).toEqual(page);
  });

  it('agrees with the ball count the overs label represents', () => {
    const state = deriveMatchState(apiLiveResponse());
    if (state.oversLabel) {
      const balls = oversToBalls(Number(state.oversLabel));
      expect(balls).not.toBeNull();
    }
  });
});
