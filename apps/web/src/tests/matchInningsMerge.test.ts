import { readPeriodScores } from '../lib/matchInnings';

describe('readPeriodScores', () => {
  // A live Test whose commentary timeline only reached innings 2 and 3; the match row has all three.
  const row = {
    periodScores: [
      { number: 1, home_score: 434, home_wickets: 9, display_overs: 106.3 },
      { number: 2, away_score: 446, away_wickets: 10, display_overs: 117.2 },
      { number: 3, home_score: 50, home_wickets: 1, display_overs: 20 },
    ],
  };
  const timeline = {
    sport_event_status: {
      period_scores: [
        { number: 2, away_score: 446, away_wickets: 10, display_overs: '117.2' },
        { number: 3, home_score: 57, home_wickets: 1, display_overs: '21.2' },
      ],
    },
  };

  it('keeps innings only the match row has, so a Test never loses its first innings', () => {
    expect(readPeriodScores(row, timeline).map((p) => p.number)).toEqual([1, 2, 3]);
  });

  it('prefers the fresher timeline value for an innings both carry', () => {
    const third = readPeriodScores(row, timeline).find((p) => p.number === 3);
    expect(third?.homeRuns).toBe(57);
    expect(third?.displayOvers).toBe(21.2);
  });

  it('falls back to whichever source has innings', () => {
    expect(readPeriodScores(row, null).length).toBe(3);
    expect(readPeriodScores(null, timeline).length).toBe(2);
  });
});
