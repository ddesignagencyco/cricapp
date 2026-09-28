import { formatOvers, g50, parScore, resourceRemaining, resourcesUsed, revisedTarget } from '../lib/dlsMath';
import { chaseChance, expectedInningsTotal, projectedInnings, winFromExpected } from '../lib/whatIfMath';
import { fantasyPoints } from '../lib/fantasyMath';

describe('DLS format constants', () => {
  it('uses the right innings length and G50 per format', () => {
    expect(formatOvers('odi')).toBe(50);
    expect(formatOvers('t20')).toBe(20);
    expect(g50('odi')).toBe(245);
    expect(g50('t20')).toBe(152);
  });
});

describe('resourceRemaining', () => {
  it('is 100% at the start of a full innings with no wickets down', () => {
    expect(resourceRemaining(50, 0, 50)).toBeCloseTo(100, 6);
  });

  it('falls as overs run out', () => {
    const half = resourceRemaining(25, 0, 50);
    const quarter = resourceRemaining(12.5, 0, 50);
    expect(half).toBeLessThan(100);
    expect(quarter).toBeLessThan(half);
  });

  it('falls faster with more wickets down', () => {
    expect(resourceRemaining(30, 5, 50)).toBeLessThan(resourceRemaining(30, 0, 50));
  });

  it('is zero when all out or when no overs remain', () => {
    expect(resourceRemaining(10, 10, 50, true)).toBe(0);
    expect(resourceRemaining(0, 2, 50)).toBe(0);
    expect(resourceRemaining(-5, 2, 50)).toBe(0);
  });

  it('never exceeds the full innings even if overs left exceed the schedule', () => {
    expect(resourceRemaining(80, 0, 50)).toBeCloseTo(100, 6);
  });
});

describe('resourcesUsed', () => {
  it('is the complement of what remains', () => {
    const used = resourcesUsed(25, 2, 50);
    const left = resourceRemaining(25, 2, 50);
    expect(used).toBeCloseTo(100 - left, 6);
  });

  it('reaches 100 once the innings is all out', () => {
    expect(resourcesUsed(20, 10, 50)).toBe(100);
  });
});

describe('revisedTarget', () => {
  it('scales the target down when resources lost are greater', () => {
    // Team 1 made 250 with 80% left; team 2 has 60% left.
    expect(revisedTarget(250, 80, 60, 'odi')).toBe(188);
  });

  it('raises the target when team 2 has more resources', () => {
    expect(revisedTarget(200, 50, 70, 'odi')).toBeGreaterThan(200);
  });

  it('adds one run when resources are level, so the target must be exceeded', () => {
    expect(revisedTarget(200, 50, 50, 'odi')).toBe(201);
  });

  it('returns null for an impossible resource figure', () => {
    expect(revisedTarget(250, 0, 60, 'odi')).toBeNull();
    expect(revisedTarget(-1, 80, 60, 'odi')).toBeNull();
  });
});

describe('parScore', () => {
  it('scales down proportionally when team 2 has fewer resources', () => {
    expect(parScore(250, 80, 60, 'odi')).toBe(187);
  });

  it('is below the original when resources are level', () => {
    expect(parScore(200, 50, 50, 'odi')).toBe(200);
  });

  it('returns null when team 1 resources are zero', () => {
    expect(parScore(200, 0, 50, 'odi')).toBeNull();
  });
});

describe('projectedInnings', () => {
  it('adds the remaining runs to the current score', () => {
    const out = projectedInnings({ currentRuns: 100, oversLeft: 10, wickets: 0, assumedRpo: 10 });
    expect(out?.remaining).toBeCloseTo(100, 6);
    expect(out?.projected).toBeCloseTo(200, 6);
  });

  it('projects a smaller total with wickets down', () => {
    const none = projectedInnings({ currentRuns: 0, oversLeft: 20, wickets: 0, assumedRpo: 9 });
    const many = projectedInnings({ currentRuns: 0, oversLeft: 20, wickets: 6, assumedRpo: 9 });
    expect(many!.projected).toBeLessThan(none!.projected);
  });

  it('never puts the low bound below the runs already scored', () => {
    const out = projectedInnings({ currentRuns: 180, oversLeft: 1, wickets: 8, assumedRpo: 6 });
    expect(out!.low).toBeGreaterThanOrEqual(180);
  });

  it('brackets the projection', () => {
    const out = projectedInnings({ currentRuns: 50, oversLeft: 10, wickets: 2, assumedRpo: 9 })!;
    expect(out.low).toBeLessThan(out.projected);
    expect(out.high).toBeGreaterThan(out.projected);
  });

  it('handles a completed innings', () => {
    const out = projectedInnings({ currentRuns: 180, oversLeft: 0, wickets: 3, assumedRpo: 9 });
    expect(out?.projected).toBe(180);
  });
});

describe('chaseChance and expected totals', () => {
  it('gives a high chance when the target is already passed', () => {
    expect(chaseChance(200, 150, 10)!).toBeGreaterThan(0.9);
  });

  it('gives a low chance when far short', () => {
    expect(chaseChance(120, 200, 1)!).toBeLessThan(0.1);
  });

  it('returns null when no overs remain', () => {
    expect(chaseChance(200, 150, 0)).toBeNull();
  });

  it('scales an expected total by overs and wickets', () => {
    expect(expectedInningsTotal(20, 9, 0)).toBeCloseTo(180, 6);
    expect(expectedInningsTotal(20, 9, 6)!).toBeLessThan(180);
    expect(expectedInningsTotal(0, 9, 0)).toBeNull();
  });
});

describe('winFromExpected', () => {
  it('returns probabilities that sum to about one', () => {
    const out = winFromExpected(180, 175);
    expect(out.a + out.b + out.tie).toBeCloseTo(1, 6);
  });

  it('favours the higher score', () => {
    const out = winFromExpected(200, 150);
    expect(out.a).toBeGreaterThan(out.b);
  });

  it('is near even for equal scores', () => {
    const out = winFromExpected(180, 180);
    expect(out.a).toBeCloseTo(out.b, 6);
  });
});

describe('fantasyPoints', () => {
  const line = {
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissed: false,
    wickets: 0,
    overs: 0,
    maidens: 0,
    bowlRuns: 0,
    catches: 0,
    stumpings: 0,
    runOuts: 0,
  };

  it('scores runs, boundaries and fielding', () => {
    const points = fantasyPoints({ ...line, runs: 60, balls: 30, fours: 4, sixes: 1, catches: 1 }, 't20');
    expect(points).toBeGreaterThan(60);
  });

  it('rewards wickets over a blank sheet', () => {
    const none = fantasyPoints(line, 't20');
    const withWicket = fantasyPoints({ ...line, wickets: 2 }, 't20');
    expect(withWicket).toBeGreaterThan(none);
  });

  it('rewards a maiden and penalises runs conceded', () => {
    expect(fantasyPoints({ ...line, overs: 4, maidens: 2, bowlRuns: 0 }, 't20')).toBeGreaterThan(
      fantasyPoints({ ...line, overs: 4, maidens: 0, bowlRuns: 40 }, 't20')
    );
  });

  it('penalises a low strike rate and rewards a high one', () => {
    const slow = fantasyPoints({ ...line, runs: 20, balls: 20 }, 't20');
    const quick = fantasyPoints({ ...line, runs: 60, balls: 20 }, 't20');
    expect(slow).toBeLessThan(quick);
  });

  it('ignores the strike-rate bonus below the minimum balls faced', () => {
    // 2 runs off 1 ball is a 200 SR but too small a sample to score.
    expect(fantasyPoints({ ...line, runs: 2, balls: 1 }, 't20')).toBe(2);
  });
});
