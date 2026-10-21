import { dlsEstimate } from '../lib/dlsMath';
import { decimalFromFractional, fractionalQuery } from '../lib/oddsMath';
import { expectedInningsTotal, projectedInnings } from '../lib/whatIfMath';
import { firstError, isValidCricketOvers, readNumber, readOvers, readWickets } from '../components/tools/toolInputs';

describe('dlsEstimate', () => {
  const base = { format: 'odi' as const, team1Score: 250, team1Overs: 50, team1Wickets: 6 };

  it('sets 251 when Team 2 keeps its full 50 overs', () => {
    const out = dlsEstimate(base);
    expect(out.r1).toBeCloseTo(100, 6);
    expect(out.r2).toBeCloseTo(100, 6);
    expect(out.target).toBe(251);
  });

  it('scales the target down when Team 2 is cut to 20 overs', () => {
    const out = dlsEstimate({ ...base, team2Overs: 20 });
    expect(out.r2).toBeCloseTo(58.9, 1);
    expect(out.target).toBe(148);
  });

  it('measures par against the reduced allocation', () => {
    const out = dlsEstimate({ ...base, team2Overs: 20, team2Faced: 10, team2Wickets: 0 });
    expect(out.par).toBe(62);
  });

  it('gives par equal to the full score once the full chase is used up', () => {
    expect(dlsEstimate({ ...base, team2Faced: 50, team2Wickets: 3 }).par).toBe(250);
  });

  it('works for a T20', () => {
    const out = dlsEstimate({ format: 't20', team1Score: 180, team1Overs: 20, team1Wickets: 5 });
    expect(out.target).toBe(181);
    const cut = dlsEstimate({ format: 't20', team1Score: 180, team1Overs: 20, team1Wickets: 5, team2Overs: 10 });
    expect(cut.target).toBeLessThan(181);
    expect(cut.target).toBeGreaterThan(90);
  });
});

describe('projectedInnings all out', () => {
  it('projects exactly the current runs once ten wickets are down', () => {
    const out = projectedInnings({ currentRuns: 100, oversLeft: 10, wickets: 10, assumedRpo: 8 })!;
    expect(out.projected).toBe(100);
    expect(out.allOut).toBe(true);
    expect(out.low).toBe(100);
    expect(out.high).toBe(100);
  });

  it('treats more than ten wickets as all out', () => {
    expect(projectedInnings({ currentRuns: 100, oversLeft: 10, wickets: 12, assumedRpo: 8 })!.projected).toBe(100);
  });

  it('keeps the simulator floor for expected wickets', () => {
    expect(expectedInningsTotal(20, 9, 10)!).toBeGreaterThan(0);
  });
});

describe('tool input readers', () => {
  it('flags a balls digit of 6 or more', () => {
    expect(isValidCricketOvers(3.5)).toBe(true);
    expect(isValidCricketOvers(3.6)).toBe(false);
    expect(isValidCricketOvers(3.7)).toBe(false);
    expect(isValidCricketOvers(3.25)).toBe(false);
    expect(readOvers('3.7', 'Overs').error).toMatch(/0–5 balls/);
    expect(readOvers('3.7', 'Overs').value).toBeNull();
    expect(readOvers('12.4', 'Overs')).toEqual({ value: 12.4, error: null });
  });

  it('keeps blank as blank, with no message', () => {
    expect(readOvers('', 'Overs')).toEqual({ value: null, error: null });
    expect(readNumber('  ', 'Runs')).toEqual({ value: null, error: null });
  });

  it('rejects negatives, fractions where whole numbers are needed, and too many wickets', () => {
    expect(readNumber('-4', 'Runs').error).toMatch(/negative/);
    expect(readOvers('-1', 'Overs').error).toMatch(/negative/);
    expect(readNumber('4.5', 'Runs', { integer: true }).error).toMatch(/whole/);
    expect(readWickets('11', 'Wickets').error).toMatch(/more than 10/);
    expect(readWickets('10', 'Wickets').value).toBe(10);
  });

  it('caps overs at the scheduled quota, compared in balls', () => {
    expect(readOvers('20.1', 'Overs', { max: 20 }).error).toMatch(/more than 20 overs/);
    expect(readOvers('19.5', 'Overs', { max: 20 }).error).toBeNull();
    expect(readOvers('10.3', 'Overs', { max: 10.2 }).error).not.toBeNull();
  });

  it('returns the first message among several inputs', () => {
    expect(firstError(readNumber('1', 'A'), readWickets('12', 'B'), readNumber('-1', 'C'))).toMatch(/^B/);
    expect(firstError(readNumber('1', 'A'), null)).toBeNull();
  });
});

describe('fractional odds query', () => {
  it('sends the sides as typed, not rounded', () => {
    expect(fractionalQuery(1.5, 1)).toBe('1.5/1');
    expect(decimalFromFractional(1.5, 1)).toBe(2.5);
    expect(fractionalQuery(0, 1)).toBe('');
    expect(fractionalQuery(5, 0)).toBe('');
  });
});
