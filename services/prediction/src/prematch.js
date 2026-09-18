export function sigmoid(z) {
  if (z > 20) return 1;
  if (z < -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

export const PREMATCH_WEIGHTS = Object.freeze({
  form: 1.4,
  h2h: 0.8,
  table: 0.9,
  venue: 0.25,
  toss: 0.15,
  conditions: 0.2,
  xi: 0.35,
});

export function confidenceBand(confidence) {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

function conditionImpact(conditions) {
  const text = JSON.stringify(conditions ?? {}).toLowerCase();
  let runs = 0;
  let winEdge = 0;
  const factors = [];
  if (/rain|overcast|cloud|humid|seam/.test(text)) {
    runs -= 8;
    factors.push({ factor: 'weather', impactRuns: -8, reason: 'seam/rain indicators' });
  }
  if (/dry|flat|batting|hard/.test(text)) {
    runs += 10;
    factors.push({ factor: 'pitch', impactRuns: 10, reason: 'batting-friendly indicators' });
  }
  if (/spin|slow|turn/.test(text)) {
    runs -= 6;
    factors.push({ factor: 'pitch', impactRuns: -6, reason: 'slow/spin indicators' });
  }
  if (/dew/.test(text)) {
    runs += 4;
    winEdge -= 0.08;
    factors.push({ factor: 'weather', impactRuns: 4, reason: 'dew may aid chasing' });
  }
  return { runs, winEdge, factors };
}

function projectedScore(snapshot) {
  const par = snapshot.parScore ?? 160;
  const conditions = conditionImpact(snapshot.conditions);
  const venueRuns = (snapshot.venueEdge ?? 0) * 3;
  const expected = Math.max(40, Math.round(par + conditions.runs + venueRuns));
  const spread = snapshot.format === 'test' ? 45 : snapshot.format === 'odi' ? 30 : 20;
  return {
    scoreRange: {
      type: 'first_innings',
      low: Math.max(0, expected - spread),
      expected,
      high: expected + spread,
      unit: 'runs',
    },
    conditions,
  };
}

export function prematchConfidence(snapshot) {
  const n = Math.min(snapshot.form?.homeN ?? 0, snapshot.form?.awayN ?? 0);
  if (n < 3) return 0.35;
  const h2hBoost = (snapshot.h2h?.meetings ?? 0) >= 3 ? 0.1 : 0;
  const xiBoost = snapshot.playerProjections?.xi?.reliability === 'high' ? 0.05 : 0;
  const sample = 0.5 + 0.4 * (1 - Math.exp(-n / 8)) + h2hBoost + xiBoost;
  return Math.min(0.9, Number(sample.toFixed(4)));
}

export function scorePrematch(snapshot) {
  const formEdge = (snapshot.form?.home ?? 0.5) - (snapshot.form?.away ?? 0.5);
  const h2hEdge = snapshot.h2h?.edge ?? 0;
  const tableEdge = snapshot.table?.used ? (snapshot.table.edge ?? 0) : 0;
  const venue = snapshot.venueEdge ?? 0;
  const toss = snapshot.toss?.edge ?? 0;
  const xiEdge = snapshot.xiEdge ?? 0;
  const projection = projectedScore(snapshot);
  const conditionsEdge = projection.conditions.winEdge;
  const weights = {
    ...PREMATCH_WEIGHTS,
    ...(snapshot.weights ?? {}),
  };

  const z =
    weights.form * formEdge +
    weights.h2h * h2hEdge +
    weights.table * tableEdge +
    weights.venue * venue +
    weights.toss * toss +
    weights.conditions * conditionsEdge +
    (weights.xi ?? 0.35) * xiEdge;

  const calibrationSlope = Number(snapshot.calibration?.slope ?? 1);
  const calibrationIntercept = Number(snapshot.calibration?.intercept ?? 0);
  const calibratedZ = calibrationSlope * z + calibrationIntercept;
  const homeWinProb = Number(sigmoid(calibratedZ).toFixed(4));
  const awayWinProb = Number((1 - homeWinProb).toFixed(4));
  const confidence = prematchConfidence(snapshot);
  const factorAttributions = [
    { factor: 'form', contribution: Number((weights.form * formEdge).toFixed(4)) },
    { factor: 'head_to_head', contribution: Number((weights.h2h * h2hEdge).toFixed(4)) },
    { factor: 'table', contribution: Number((weights.table * tableEdge).toFixed(4)) },
    { factor: 'venue', contribution: Number((weights.venue * venue).toFixed(4)) },
    { factor: 'toss', contribution: Number((weights.toss * toss).toFixed(4)) },
    { factor: 'conditions', contribution: Number((weights.conditions * conditionsEdge).toFixed(4)) },
    { factor: 'xi', contribution: Number(((weights.xi ?? 0.35) * xiEdge).toFixed(4)) },
  ];

  return {
    homeWinProb,
    awayWinProb,
    confidence,
    calibrationBand: confidenceBand(confidence),
    scoreRange: projection.scoreRange,
    topBatters: snapshot.playerProjections?.topBatters ?? [],
    topBowlers: snapshot.playerProjections?.topBowlers ?? [],
    xi: snapshot.playerProjections?.xi ?? { home: [], away: [], method: 'unavailable' },
    explanation: {
      z: Number(z.toFixed(4)),
      calibratedZ: Number(calibratedZ.toFixed(4)),
      calibration: {
        slope: calibrationSlope,
        intercept: calibrationIntercept,
        format: snapshot.format ?? null,
        source: snapshot.calibration?.source ?? null,
      },
      formEdge: Number(formEdge.toFixed(4)),
      h2hEdge: Number(h2hEdge.toFixed(4)),
      tableEdge: Number(tableEdge.toFixed(4)),
      venueEdge: venue,
      tossEdge: toss,
      xiEdge: Number(xiEdge.toFixed(4)),
      conditionsImpact: projection.conditions,
      weights,
      tossAdjusted: toss !== 0,
      tossDecision: snapshot.toss?.decision ?? null,
      parSource: snapshot.parSource ?? null,
      factorAttributions,
    },
  };
}
