import { describe, it, expect } from '@jest/globals';
import {
  buildPslQualificationVerified,
  remainingFixturesByTeam,
  PSL_PLAYOFF_SPOTS,
} from './psl-qualification.util.js';

describe('psl-qualification.util', () => {
  it('counts remaining fixtures per team', () => {
    const map = remainingFixturesByTeam([
      { status: 'not_started', homeTeamId: 'a', awayTeamId: 'b' },
      { status: 'closed', homeTeamId: 'a', awayTeamId: 'c' },
    ]);
    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBe(1);
    expect(map.get('c')).toBeUndefined();
  });

  it('marks team outside top 4 as alive when max points can overtake cutoff', () => {
    const standings = [
      { teamId: 't1', teamName: 'T1', teamAbbr: 'T1', rank: 1, played: 10, points: 20, netRunRate: 0.5 },
      { teamId: 't2', teamName: 'T2', teamAbbr: 'T2', rank: 2, played: 10, points: 18, netRunRate: 0.4 },
      { teamId: 't3', teamName: 'T3', teamAbbr: 'T3', rank: 3, played: 10, points: 16, netRunRate: 0.3 },
      { teamId: 't4', teamName: 'T4', teamAbbr: 'T4', rank: 4, played: 10, points: 14, netRunRate: 0.2 },
      { teamId: 't5', teamName: 'T5', teamAbbr: 'T5', rank: 5, played: 9, points: 12, netRunRate: 0.1 },
    ];
    const remaining = new Map([['t5', 2]]);
    const verified = buildPslQualificationVerified({
      seasonId: 'sr:season:x',
      seasonName: 'PSL Test',
      standings,
      remainingByTeam: remaining,
      focusTeamId: 't5',
    });
    expect(verified.playoffSpots).toBe(PSL_PLAYOFF_SPOTS);
    expect(verified.focusTeam?.mathematicallyAlive).toBe(true);
    expect(verified.focusTeam?.maxPossiblePoints).toBe(16);
  });
});
