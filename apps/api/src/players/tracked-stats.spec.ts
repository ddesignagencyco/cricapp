import { aggregateTrackedStats, ballsToOvers, oversToBalls } from './tracked-stats.util.js';

describe('tracked stats', () => {
  it('reads overs as cricket notation', () => {
    expect(oversToBalls('3.2')).toBe(20);
    expect(oversToBalls(4)).toBe(24);
    expect(ballsToOvers(20)).toBe('3.2');
    expect(ballsToOvers(24)).toBe('4');
  });

  it('aggregates batting: average counts dismissals, not innings; not-outs are tracked', () => {
    const r = aggregateTrackedStats(
      [
        { matchId: 'm1', s: { runs: 102, balls_faced: 48, fours: 10, sixes: 6, dismissal: { type: 'caught' } } },
        { matchId: 'm2', s: { runs: 55, balls_faced: 40, fours: 4, sixes: 2 } }, // not out
        { matchId: 'm3', s: { runs: 0, balls_faced: 3, dismissal: { type: 'bowled' } } },
      ],
      [],
    );
    expect(r.matches).toBe(3);
    expect(r.batting).toMatchObject({
      innings: 3, runs: 157, balls: 91, notOuts: 1, highest: 102, highestNotOut: false,
      fifties: 1, hundreds: 1, ducks: 1, fours: 14, sixes: 8,
    });
    expect(r.batting?.average).toBe(78.5); // 157 / 2 dismissals
    expect(r.batting?.strikeRate).toBe(172.53);
    expect(r.bowling).toBeNull();
  });

  it('aggregates bowling: economy by balls, best figures, and skips spells with no balls', () => {
    const r = aggregateTrackedStats(
      [],
      [
        { matchId: 'm1', s: { overs_bowled: '4', maidens: 1, conceded_runs: 20, wickets: 3 } },
        { matchId: 'm2', s: { overs_bowled: '3.2', maidens: 0, conceded_runs: 30, wickets: 4 } },
        { matchId: 'm3', s: { overs_bowled: '0', conceded_runs: 0, wickets: 0 } },
      ],
    );
    expect(r.matches).toBe(3); // appearing on the card counts as a match, even without a ball bowled
    expect(r.bowling).toMatchObject({ innings: 2, overs: '7.2', maidens: 1, runs: 50, wickets: 7, best: '4/30', fourWickets: 1 });
    expect(r.bowling?.economy).toBe(6.82);
    expect(r.bowling?.average).toBe(7.14);
  });

  it('is empty for a player in no stored scorecard', () => {
    expect(aggregateTrackedStats([], [])).toEqual({ matches: 0, batting: null, bowling: null });
  });
});
