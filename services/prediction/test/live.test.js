import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { blendLivePrior, oversToBalls, resourcesRemaining, scoreLive } from '../src/live.js';

describe('oversToBalls', () => {
  it('converts cricket decimal overs to balls', () => {
    assert.equal(oversToBalls(15.3), 93);
    assert.equal(oversToBalls(0), 0);
    assert.equal(oversToBalls(20), 120);
  });
});

describe('resourcesRemaining', () => {
  it('drops immediately when a wicket is lost', () => {
    const before = resourcesRemaining({ remainingBalls: 60, allottedBalls: 120, wicketsLost: 2 });
    const after = resourcesRemaining({ remainingBalls: 60, allottedBalls: 120, wicketsLost: 3 });
    assert.ok(after < before);
  });
});

describe('blendLivePrior', () => {
  it('pulls an even live signal toward a strong pre-match prior at match start', () => {
    const { blended, priorWeight } = blendLivePrior(0.5, 0.8, 0);
    assert.ok(priorWeight > 0.55);
    assert.ok(blended > 0.62 && blended < 0.8);
  });

  it('fades the prior to zero once enough match progress has passed', () => {
    const early = blendLivePrior(0.5, 0.8, 0.2, { decayProgress: 0.4 });
    const late = blendLivePrior(0.5, 0.8, 0.5, { decayProgress: 0.4 });
    assert.ok(early.priorWeight > late.priorWeight);
    assert.equal(late.priorWeight, 0);
    assert.equal(late.blended, 0.5);
  });

  it('treats a missing prior as no blend', () => {
    const { blended, priorWeight } = blendLivePrior(0.5, null, 0);
    assert.equal(priorWeight, 0);
    assert.equal(blended, 0.5);
  });
});

describe('scoreLive', () => {
  it('projects a first-innings batting side above par as favourite', () => {
    const out = scoreLive({
      format: 't20',
      allottedBalls: 120,
      currentInning: 1,
      homeTeamId: 'sr:competitor:1',
      awayTeamId: 'sr:competitor:2',
      homeName: 'LQ',
      awayName: 'KK',
      currentInnings: { battingTeam: 'sr:competitor:1', runs: 120, wickets: 1, overs: 12, runRate: 10 },
      lastEvent: { type: 'runs', runs: 6, over: 12 },
    });
    assert.ok(out.homeWinProb > 0.55);
    assert.equal(out.explanation.reasons[0], 'boundary');
    assert.ok(out.explanation.projectedTotal > 120);
    assert.ok(out.scoreRange.low <= out.scoreRange.expected);
    assert.ok(out.scoreRange.expected <= out.scoreRange.high);
    assert.ok(out.pressureIndex >= 0 && out.pressureIndex <= 1);
    assert.ok(out.wicketRisk >= 0 && out.wicketRisk <= 1);
    assert.ok(out.partnershipProjection.expectedAdditionalRuns >= 0);
    assert.ok(out.explanation.factorAttributions.length >= 4);
  });

  it('raises chase probability when required runs are well inside remaining resources', () => {
    const out = scoreLive({
      format: 't20',
      allottedBalls: 120,
      currentInning: 2,
      target: 140,
      homeTeamId: 'sr:competitor:1',
      awayTeamId: 'sr:competitor:2',
      homeName: 'LQ',
      awayName: 'KK',
      currentInnings: { battingTeam: 'sr:competitor:2', runs: 100, wickets: 1, overs: 12, runRate: 8.3 },
      lastEvent: { type: 'runs', runs: 4, over: 12 },
    });
    assert.ok(out.awayWinProb > 0.5);
    assert.equal(out.explanation.inning, 2);
    assert.equal(out.explanation.battingIsHome, false);
  });

  it('maps abbreviation batting tokens to the correct side (SRI vs India)', () => {
    const out = scoreLive({
      format: 't20',
      allottedBalls: 120,
      currentInning: 2,
      target: 217,
      homeTeamId: 'sr:competitor:ind',
      awayTeamId: 'sr:competitor:sl',
      homeName: 'India',
      awayName: 'Sri Lanka',
      homeAbbr: 'IND',
      awayAbbr: 'SRI',
      teamScores: {
        home: { code: 'IND', name: 'India', score: '216/3', overs: '20' },
        away: { code: 'SRI', name: 'Sri Lanka', score: '69/10', overs: '15.4' },
      },
      currentInnings: {
        battingTeam: 'SRI',
        runs: 69,
        wickets: 10,
        overs: 15.4,
        runRate: 4.5,
      },
      lastEvent: { type: 'wicket', runs: 0, over: 15.4 },
    });
    assert.equal(out.explanation.battingIsHome, false);
    assert.ok(out.homeWinProb > 0.9);
  });

  it('records a wicket reason and a delta from the previous live run', () => {
    const previous = { homeWinProb: 0.6, awayWinProb: 0.4 };
    const out = scoreLive(
      {
        format: 't20',
        allottedBalls: 120,
        currentInning: 1,
        homeTeamId: 'sr:competitor:1',
        awayTeamId: 'sr:competitor:2',
        currentInnings: { battingTeam: 'sr:competitor:1', runs: 80, wickets: 5, overs: 12, runRate: 6.6 },
        lastEvent: { type: 'wicket', runs: 0, over: 12 },
      },
      previous,
    );
    assert.deepEqual(out.explanation.reasons, ['wicket']);
    assert.ok(typeof out.explanation.deltaFromPrevious === 'number');
  });

  it('blends an even match start toward the pre-match prior', () => {
    const prior = { runId: 'run-1', homeWinProb: 0.82 };
    const snapshot = {
      format: 't20',
      allottedBalls: 120,
      currentInning: 1,
      homeTeamId: 'sr:competitor:1',
      awayTeamId: 'sr:competitor:2',
      homeName: 'LQ',
      awayName: 'KK',
      currentInnings: { battingTeam: 'sr:competitor:1', runs: 0, wickets: 0, overs: 0, runRate: 0 },
      lastEvent: { type: 'none', runs: 0, over: 0 },
    };
    const withoutPrior = scoreLive(snapshot);
    assert.ok(withoutPrior.homeWinProb > 0.45 && withoutPrior.homeWinProb < 0.55);
    assert.equal(withoutPrior.explanation.priorBlend, false);

    const withPrior = scoreLive(snapshot, null, { prior });
    assert.equal(withPrior.explanation.priorBlend, true);
    assert.ok(withPrior.explanation.priorWeight > 0.55);
    assert.equal(withPrior.explanation.priorHomeWinProb, 0.82);
    assert.ok(withPrior.homeWinProb > withoutPrior.homeWinProb);
    assert.ok(withPrior.homeWinProb > 0.62 && withPrior.homeWinProb < 0.82);
  });

  it('stops blending once match progress has consumed the prior window', () => {
    const prior = { homeWinProb: 0.9 };
    const snapshot = {
      format: 't20',
      allottedBalls: 120,
      currentInning: 2,
      target: 140,
      homeTeamId: 'sr:competitor:1',
      awayTeamId: 'sr:competitor:2',
      homeName: 'LQ',
      awayName: 'KK',
      currentInnings: { battingTeam: 'sr:competitor:1', runs: 135, wickets: 3, overs: 19.5, runRate: 6.9 },
      lastEvent: { type: 'runs', runs: 2, over: 19.5 },
    };
    const out = scoreLive(snapshot, null, { prior, priorDecayProgress: 0.6 });
    assert.equal(out.explanation.priorWeight, 0);
    assert.equal(out.explanation.priorBlend, false);
    assert.ok(out.homeWinProb < 0.5);
  });
});

describe('live model fixes', () => {
  const base = {
    format: 't20',
    homeAbbr: 'AUS',
    homeName: 'Australia',
    awayAbbr: 'NZL',
    awayName: 'New Zealand',
    parScore: 160,
  };

  it('first innings: losing wickets lowers the batting side’s chance at the same score', () => {
    const fresh = scoreLive({ ...base, currentInning: 1, currentInnings: { battingTeam: 'AUS', runs: 60, wickets: 0, overs: 10, runRate: 6 } });
    const collapsed = scoreLive({ ...base, currentInning: 1, currentInnings: { battingTeam: 'AUS', runs: 60, wickets: 9, overs: 10, runRate: 6 } });
    assert.ok(collapsed.homeWinProb < fresh.homeWinProb - 0.05, `${collapsed.homeWinProb} vs ${fresh.homeWinProb}`);
  });

  it('first innings with all wickets in hand projects as before (factor 1)', () => {
    const r = scoreLive({ ...base, currentInning: 1, currentInnings: { battingTeam: 'AUS', runs: 80, wickets: 0, overs: 10, runRate: 8 } });
    assert.equal(r.explanation.projectedTotal, 160);
  });

  it('does not reset the pre-match prior to full weight at the start of the chase', () => {
    const prior = { homeWinProb: 0.8 };
    const startOfChase = scoreLive(
      { ...base, currentInning: 2, target: 161, currentInnings: { battingTeam: 'NZL', runs: 0, wickets: 0, overs: 0, runRate: 0 } },
      null,
      { prior },
    );
    assert.ok(startOfChase.explanation.priorWeight < 0.2, `prior weight ${startOfChase.explanation.priorWeight}`);
  });

  it('reports momentum from the home side: away batting well is negative', () => {
    const r = scoreLive({ ...base, currentInning: 1, currentInnings: { battingTeam: 'NZL', runs: 100, wickets: 0, overs: 10, runRate: 10 } });
    assert.ok(r.momentum < 0, `momentum ${r.momentum}`);
    assert.equal(r.homeWinProb < 0.5, true);
  });

  it('has no momentum before a ball is bowled', () => {
    const r = scoreLive({ ...base, currentInning: 1, currentInnings: { battingTeam: 'AUS', runs: 0, wickets: 0, overs: 0, runRate: 0 } });
    assert.equal(r.momentum, 0);
  });

  it('never produces NaN from a non-numeric run rate', () => {
    const r = scoreLive({ ...base, currentInning: 1, currentInnings: { battingTeam: 'AUS', runs: 40, wickets: 1, overs: 5, runRate: 'n/a' } });
    assert.ok(Number.isFinite(r.homeWinProb));
  });
});

describe('scoreLive — early-innings run rate', () => {
  // ODI first innings, away side batting, as stored for AFG v BAN on 21 Oct 2026.
  const snap = (runs, overs, wickets = 0) => ({
    format: 'odi',
    allottedBalls: 300,
    parScore: 270,
    currentInning: 1,
    battingTeam: 'away',
    teamScores: { home: { score: '' }, away: { score: `${runs}/${wickets}` } },
    matchStatus: 'first_innings_away_team',
    currentInnings: { runs, wickets, overs, runRate: overs > 0 ? runs / (oversToBalls(overs) / 6) : 0 },
  });

  it('one ball for two does not swing the match', () => {
    const start = scoreLive(snap(0, 0), null, { prior: { homeWinProb: 0.743 } });
    const oneBall = scoreLive(snap(2, 0.1), start, { prior: { homeWinProb: 0.743 } });
    // Previously 65% -> 32% on this ball (projected total ~600).
    assert.ok(Math.abs(oneBall.homeWinProb - start.homeWinProb) < 0.05, `${start.homeWinProb} -> ${oneBall.homeWinProb}`);
    assert.ok(oneBall.explanation.projectedTotal < 300, `projected ${oneBall.explanation.projectedTotal}`);
  });

  it('a sustained scoring rate still moves the projection', () => {
    const fast = scoreLive(snap(120, 15), null);
    const slow = scoreLive(snap(45, 15), null);
    assert.ok(fast.explanation.projectedTotal > slow.explanation.projectedTotal + 100);
  });
});
