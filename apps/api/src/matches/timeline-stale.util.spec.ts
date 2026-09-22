import { isLiveTimelineBehindMatch } from './timeline-stale.util.js';

describe('isLiveTimelineBehindMatch', () => {
  const liveMatch = {
    status: 'live',
    displayScore: '93/2',
    displayOvers: 15.4,
  };

  it('returns false when timeline sport_event_status matches the match row', () => {
    const payload = {
      sport_event_status: { display_score: '93/2', display_overs: 15.4 },
      sport_event_timeline: { timeline: [{ display_score: '93/2', display_overs: 15.4 }] },
    };
    expect(isLiveTimelineBehindMatch(liveMatch, payload)).toBe(false);
  });

  it('returns true when timeline score/overs lag the live match summary', () => {
    const payload = {
      sport_event_timeline: {
        sport_event_status: { display_score: '16/1', display_overs: 3.2 },
        timeline: [{ display_score: '16/1', display_overs: 3.3 }],
      },
    };
    expect(isLiveTimelineBehindMatch(liveMatch, payload)).toBe(true);
  });

  it('returns false for non-live matches', () => {
    const payload = {
      sport_event_status: { display_score: '16/1', display_overs: 3.2 },
    };
    expect(
      isLiveTimelineBehindMatch(
        { status: 'closed', displayScore: '200/5', displayOvers: 20 },
        payload,
      ),
    ).toBe(false);
  });
});
