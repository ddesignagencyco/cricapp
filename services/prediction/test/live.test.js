import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { oversToBalls, resourcesRemaining, scoreLive } from '../src/live.js';

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
});
