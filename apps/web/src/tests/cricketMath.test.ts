import {
  ballsToDecimalOvers,
  battingAverage,
  battingStrikeRate,
  bowlingAverage,
  bowlingEconomy,
  cricketOvers,
  currentRunRate,
  finite,
  followOnLead,
  followOnNeeded,
  formatCricketOvers,
  formatRate,
  netRunRate,
  oversToBalls,
  requiredRunRate,
  requiredRunRateFromOvers,
} from '../lib/cricketMath';

describe('finite', () => {
  it('rejects empty values instead of coercing them to 0', () => {
    expect(finite('')).toBeNull();
    expect(finite(null)).toBeNull();
    expect(finite(undefined)).toBeNull();
    expect(finite('abc')).toBeNull();
  });

  it('accepts numeric values and numeric strings', () => {
    expect(finite(0)).toBe(0);
    expect(finite('12.5')).toBe(12.5);
  });
});

describe('oversToBalls', () => {
  it('reads cricket overs, not decimal overs', () => {
    // 10.3 overs is 10 overs + 3 balls = 63 balls, not 10.3.
    expect(oversToBalls(10.3)).toBe(63);
    expect(oversToBalls(20)).toBe(120);
    expect(oversToBalls(0)).toBe(0);
  });

  it('rolls 6 balls into the next over', () => {
    // A data source rounding 17.6 into 18 must not become 17.6 overs.
    expect(oversToBalls(0.6)).toBe(6);
    expect(oversToBalls(17.6)).toBe(108);
  });

  it('rejects negative and non-finite input', () => {
    expect(oversToBalls(-1)).toBeNull();
    expect(oversToBalls(NaN)).toBeNull();
  });
});

describe('formatCricketOvers', () => {
  it('formats whole and partial overs', () => {
    expect(formatCricketOvers(10.3)).toBe('10.3');
    expect(formatCricketOvers(20)).toBe('20');
    expect(formatCricketOvers(0.6)).toBe('1');
  });

  it('returns an empty string rather than "NaN" for bad input', () => {
    expect(formatCricketOvers('')).toBe('');
    expect(formatCricketOvers(null)).toBe('');
    expect(formatCricketOvers(undefined)).toBe('');
    expect(formatCricketOvers('nope')).toBe('');
    expect(formatCricketOvers(-3)).toBe('');
  });
});

describe('overs round trips', () => {
  it('converts balls back to decimal overs', () => {
    expect(ballsToDecimalOvers(63)).toBe(10.5);
    expect(ballsToDecimalOvers(0)).toBeNull();
    expect(ballsToDecimalOvers(-6)).toBeNull();
  });

  it('cricketOvers is oversToBalls expressed in decimal', () => {
    expect(cricketOvers(10.3)).toBe(10.5);
    expect(cricketOvers(0)).toBeNull();
  });
});

describe('batting and bowling rates', () => {
  it('computes strike rate per 100 balls', () => {
    expect(battingStrikeRate(60, 30)).toBe(200);
    expect(battingStrikeRate(60, 0)).toBeNull();
  });

  it('computes averages only when there is a denominator', () => {
    expect(battingAverage(300, 5)).toBe(60);
    // A not-out innings is not a dismissal, so no average can be derived.
    expect(battingAverage(300, 0)).toBeNull();
    expect(bowlingAverage(120, 4)).toBe(30);
    expect(bowlingAverage(120, 0)).toBeNull();
  });

  it('computes economy and run rate from true overs, not decimal overs', () => {
    // 10.3 overs is 10.5 decimal overs, so 105 runs off it is exactly 10.00/over.
    expect(bowlingEconomy(105, 10.3)).toBeCloseTo(10, 6);
    expect(currentRunRate(105, 10.3)).toBeCloseTo(10, 6);
    expect(currentRunRate(100, 0)).toBeNull();
  });

  it('required run rate is per over from balls or overs left', () => {
    expect(requiredRunRate(120, 60)).toBe(12);
    expect(requiredRunRate(120, 0)).toBeNull();
    // 20 overs left is 120 balls, so 240 runs needed is 12/over.
    expect(requiredRunRateFromOvers(240, 20)).toBe(12);
    expect(requiredRunRateFromOvers(240, 0)).toBeNull();
  });
});

describe('netRunRate', () => {
  it('is runs per over for minus runs per over against', () => {
    // 200 off 20 overs (10.0) minus 150 off 20 overs (7.5) = 2.5
    expect(netRunRate(200, 20, 150, 20)).toBeCloseTo(2.5, 6);
  });

  it('uses the full allocation for an all-out side, per ICC', () => {
    // Side bowled out in 10 overs of a 50-over match counts the full 50.
    const partial = netRunRate(100, 10, 200, 20);
    const allOut = netRunRate(100, 10, 200, 20, { allOutFor: true, scheduledOvers: 50 });
    expect(partial).toBeCloseTo(0, 6); // 100/10 - 200/20 = 0
    expect(allOut).toBeCloseTo(-8, 6); // 100/50 - 200/20 = 2 - 10
  });

  it('returns null when either side has no overs', () => {
    expect(netRunRate(100, 0, 200, 20)).toBeNull();
    expect(netRunRate(100, 20, 200, 0)).toBeNull();
  });
});

describe('follow-on', () => {
  it('applies the Law 14 lead for each match length', () => {
    expect(followOnNeeded(5)).toBe(200);
    expect(followOnNeeded(4)).toBe(150);
    expect(followOnNeeded(3)).toBe(150);
    expect(followOnNeeded(2)).toBe(100);
    expect(followOnNeeded(1)).toBe(75);
  });

  it('is enforced when the lead meets the threshold', () => {
    expect(followOnLead(250, 100, 5)).toEqual({ lead: 150, needed: 200, enforced: false });
    expect(followOnLead(320, 100, 5)).toEqual({ lead: 220, needed: 200, enforced: true });
    // Exactly on the threshold counts.
    expect(followOnLead(300, 100, 5).enforced).toBe(true);
  });
});

describe('formatRate', () => {
  it('renders a dash for a missing value instead of NaN', () => {
    expect(formatRate(null)).toBe('—');
    expect(formatRate(8.456)).toBe('8.46');
    expect(formatRate(8.456, 3)).toBe('8.456');
  });
});
