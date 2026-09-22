import { sigmoid } from './prematch.js';
import { allottedBallsForFormat, parScoreForFormat } from './features.js';
import { battingIsHomeTeam } from './liveGuard.js';

export function oversToBalls(overs) {
  if (!overs || overs <= 0) return 0;
  const whole = Math.floor(overs);
  const balls = Math.round((overs - whole) * 10);
  return whole * 6 + Math.min(balls, 5);
}

export function resourcesRemaining({ remainingBalls, allottedBalls, wicketsLost }) {
  const wicketsLeft = Math.max(0, 10 - (wicketsLost ?? 0));
  const ballFrac = allottedBalls <= 0 ? 0 : Math.max(0, remainingBalls) / allottedBalls;
  const wicketFrac = Math.sqrt(wicketsLeft / 10);
  return Math.max(0, Math.min(1, ballFrac * (0.35 + 0.65 * wicketFrac)));
}

function reasonsFromEvent(lastEvent) {
  const type = lastEvent?.type;
  if (type === 'wicket') return ['wicket'];
  if (type === 'runs' && (lastEvent.runs ?? 0) >= 4) return ['boundary'];
  if (type === 'status_change') return ['status_change'];
  return ['score'];
}

export function scoreLive(snapshot, previous = null) {
  const format = snapshot.format === 'unknown' ? 't20' : snapshot.format;
  const allottedBalls = snapshot.allottedBalls || allottedBallsForFormat(format);
  const par = parScoreForFormat(format);
  const innings = snapshot.currentInnings ?? { runs: 0, wickets: 0, overs: 0, runRate: 0 };
  const ballsFaced = oversToBalls(innings.overs ?? 0);
  const remainingBalls =
    snapshot.remainingOvers != null
      ? Math.round(Number(snapshot.remainingOvers) * 6)
      : Math.max(0, allottedBalls - ballsFaced);
  const wicketsLost = innings.wickets ?? 0;
  const resourcesLeft = resourcesRemaining({
    remainingBalls,
    allottedBalls,
    wicketsLost,
  });
  const currentInning = snapshot.currentInning >= 2 ? 2 : 1;
  const rr = Number(innings.runRate ?? snapshot.runRate ?? 0);
  const remainingOvers = remainingBalls / 6;

  let battingWinProb;
  let projectedTotal = null;
  let requiredRuns = null;

  if (currentInning === 1) {
    const projectedRemaining = rr > 0 ? rr * remainingOvers : (par / allottedBalls) * remainingBalls;
    projectedTotal = (innings.runs ?? 0) + projectedRemaining;
    const blended = remainingBalls === 0 ? (innings.runs ?? 0) : 0.7 * projectedTotal + 0.3 * par;
    battingWinProb = sigmoid((blended - par) / 25);
  } else {
    const target = Number(snapshot.target ?? 0) || Math.round(par) + 1;
    requiredRuns = Math.max(0, target - (innings.runs ?? 0));
    const expectedRemaining = resourcesLeft * par;
    battingWinProb = sigmoid((expectedRemaining - requiredRuns) / 18);
  }

  battingWinProb = Number(Math.min(0.97, Math.max(0.03, battingWinProb)).toFixed(4));
  const bowlingWinProb = Number((1 - battingWinProb).toFixed(4));
  const homeBatting = battingIsHomeTeam(snapshot) ?? false;
  const homeWinProb = homeBatting ? battingWinProb : bowlingWinProb;
  const awayWinProb = Number((1 - homeWinProb).toFixed(4));

  const requiredRunRate =
    snapshot.requiredRunRate != null
      ? Number(snapshot.requiredRunRate)
      : currentInning === 2 && remainingOvers > 0
        ? Number((requiredRuns / remainingOvers).toFixed(2))
        : null;

  const prevHome = previous?.homeWinProb ?? homeWinProb;
  const deltaFromPrevious = Number((homeWinProb - prevHome).toFixed(4));
  const scoringRate = Math.max(0, rr / Math.max(1, par / (allottedBalls / 6)));
  const wicketPressure = Math.min(1, wicketsLost / 10);
  const chasePressure =
    currentInning === 2 && requiredRunRate != null
      ? Math.max(0, Math.min(1, (requiredRunRate - rr) / Math.max(1, requiredRunRate)))
      : 0;
  const pressureIndex = Number(
    Math.max(0, Math.min(1, 0.55 * wicketPressure + 0.45 * chasePressure)).toFixed(4),
  );
  const momentum = Number(
    Math.max(-1, Math.min(1, (scoringRate - 1) * 0.6 - pressureIndex * 0.4)).toFixed(4),
  );
  const wicketRisk = Number(
    Math.max(0.05, Math.min(0.95, 0.12 + pressureIndex * 0.55 + wicketPressure * 0.2)).toFixed(4),
  );
  const partnershipExpectedRuns = Math.max(
    0,
    Math.round(Math.min(remainingBalls / 6, 8) * Math.max(2, rr) * (1 - wicketRisk)),
  );
  const rangeExpected =
    currentInning === 1
      ? Math.round(projectedTotal ?? innings.runs ?? 0)
      : Math.round((innings.runs ?? 0) + Math.min(requiredRuns ?? 0, resourcesLeft * par));
  const rangeSpread = Math.max(6, Math.round(18 * resourcesLeft + pressureIndex * 10));
  const scoreRange = {
    type: currentInning === 1 ? 'first_innings' : 'chase_total',
    low: Math.max(Number(innings.runs ?? 0), rangeExpected - rangeSpread),
    expected: rangeExpected,
    high: rangeExpected + rangeSpread,
    unit: 'runs',
  };
  const factorAttributions = [
    { factor: 'scoring_rate', impact: Number(((scoringRate - 1) * 0.6).toFixed(4)) },
    { factor: 'wickets', impact: Number((-wicketPressure * 0.35).toFixed(4)) },
    { factor: 'chase_pressure', impact: Number((-chasePressure * 0.45).toFixed(4)) },
    { factor: 'resources', impact: Number(((resourcesLeft - 0.5) * 0.3).toFixed(4)) },
  ];

  const n = (snapshot.currentInnings?.overs ?? 0) > 0 ? 1 : 0;
  const confidence = currentInning === 1 && n === 0 ? 0.4 : 0.55;

  return {
    homeWinProb,
    awayWinProb,
    confidence,
    calibrationBand: confidence >= 0.75 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
    scoreRange,
    momentum,
    pressureIndex,
    wicketRisk,
    partnershipProjection: {
      expectedAdditionalRuns: partnershipExpectedRuns,
      horizonBalls: Math.min(remainingBalls, 48),
      reliability: innings.overs > 0 ? 'medium' : 'low',
    },
    explanation: {
      over: innings.overs ?? 0,
      wickets: wicketsLost,
      inning: currentInning,
      battingIsHome: homeBatting,
      resourcesLeft: Number(resourcesLeft.toFixed(4)),
      remainingBalls,
      requiredRunRate,
      requiredRuns,
      projectedTotal: projectedTotal != null ? Number(projectedTotal.toFixed(1)) : null,
      deltaFromPrevious,
      reasons: reasonsFromEvent(snapshot.lastEvent),
      factorAttributions,
      momentum,
      pressureIndex,
      wicketRisk,
    },
  };
}
