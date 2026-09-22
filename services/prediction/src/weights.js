import { PREMATCH_WEIGHTS, sigmoid } from './prematch.js';
import { brierScore } from './settle.js';

const EDGE_KEYS = ['form', 'h2h', 'table', 'venue', 'toss', 'conditions', 'xi'];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function defaultPrematchWeights() {
  return {
    form: PREMATCH_WEIGHTS.form,
    h2h: PREMATCH_WEIGHTS.h2h,
    table: PREMATCH_WEIGHTS.table,
    venue: PREMATCH_WEIGHTS.venue,
    toss: PREMATCH_WEIGHTS.toss,
    conditions: PREMATCH_WEIGHTS.conditions,
    xi: 0.35,
  };
}

export function edgesFromExplanation(explanation = {}, snapshot = {}) {
  return {
    form: Number(explanation.formEdge ?? 0),
    h2h: Number(explanation.h2hEdge ?? 0),
    table: Number(explanation.tableEdge ?? 0),
    venue: Number(explanation.venueEdge ?? snapshot.venueEdge ?? 0),
    toss: Number(explanation.tossEdge ?? snapshot.toss?.edge ?? 0),
    conditions: Number(explanation.conditionsImpact?.winEdge ?? 0),
    xi: Number(explanation.xiEdge ?? snapshot.xiEdge ?? 0),
  };
}

export function logitFromEdges(edges, weights) {
  let z = 0;
  for (const key of EDGE_KEYS) {
    z += Number(weights[key] ?? 0) * Number(edges[key] ?? 0);
  }
  return z;
}

/**
 * Fit pre-match feature weights with logistic gradient descent on settled edges.
 */
export function fitPrematchWeights(
  rows,
  {
    minSamples = Number(process.env.WEIGHT_MIN_SAMPLES || 40),
    iterations = 250,
    learningRate = 0.08,
  } = {},
) {
  const points = rows.filter(
    (row) => row.edges && (row.homeWon === true || row.homeWon === false),
  );
  if (points.length < minSamples) {
    return {
      applied: false,
      reason: 'insufficient_sample',
      sampleSize: points.length,
      weights: defaultPrematchWeights(),
    };
  }

  const weights = defaultPrematchWeights();
  for (let step = 0; step < iterations; step += 1) {
    const grad = Object.fromEntries(EDGE_KEYS.map((k) => [k, 0]));
    for (const point of points) {
      const z = logitFromEdges(point.edges, weights);
      const pred = sigmoid(z);
      const err = pred - (point.homeWon ? 1 : 0);
      for (const key of EDGE_KEYS) {
        grad[key] += err * Number(point.edges[key] ?? 0);
      }
    }
    for (const key of EDGE_KEYS) {
      weights[key] -= (learningRate * grad[key]) / points.length;
    }
  }

  const clamped = {
    form: Number(clamp(weights.form, 0.2, 3).toFixed(4)),
    h2h: Number(clamp(weights.h2h, 0.1, 2).toFixed(4)),
    table: Number(clamp(weights.table, 0.1, 2).toFixed(4)),
    venue: Number(clamp(weights.venue, 0.05, 1.2).toFixed(4)),
    toss: Number(clamp(weights.toss, 0.05, 1).toFixed(4)),
    conditions: Number(clamp(weights.conditions, 0.05, 1).toFixed(4)),
    xi: Number(clamp(weights.xi, 0.05, 1.5).toFixed(4)),
  };

  let brier = 0;
  let correct = 0;
  for (const point of points) {
    const homeWinProb = sigmoid(logitFromEdges(point.edges, clamped));
    brier += brierScore(homeWinProb, point.homeWon);
    const favoriteHome = homeWinProb > 0.5;
    if (
      (favoriteHome && point.homeWon) ||
      (!favoriteHome && !point.homeWon && homeWinProb !== 0.5)
    ) {
      correct += 1;
    }
  }

  return {
    applied: true,
    weights: clamped,
    sampleSize: points.length,
    brierScore: Number((brier / points.length).toFixed(4)),
    accuracy: Number((correct / points.length).toFixed(4)),
  };
}

/**
 * Fit first-innings / chase sigmoid scales from settled live runs when available.
 * Falls back to defaults when sample is sparse.
 */
export function fitLiveScales(rows, { minSamples = 30 } = {}) {
  const defaults = {
    firstInningsScale: 25,
    chaseScale: 18,
    chaseWicketBonus: 0.35,
  };
  if (!rows.length || rows.length < minSamples) {
    return { applied: false, reason: 'insufficient_sample', sampleSize: rows.length, ...defaults };
  }
  // Keep defaults for now but allow mild shrinkage toward observed residual magnitude.
  let firstResid = 0;
  let firstN = 0;
  let chaseResid = 0;
  let chaseN = 0;
  for (const row of rows) {
    const residual = Math.abs(Number(row.margin ?? 0));
    if (!Number.isFinite(residual)) continue;
    if (row.inning === 2) {
      chaseResid += residual;
      chaseN += 1;
    } else {
      firstResid += residual;
      firstN += 1;
    }
  }
  const firstInningsScale =
    firstN > 0
      ? Number(clamp((firstResid / firstN) * 1.1 || defaults.firstInningsScale, 16, 36).toFixed(2))
      : defaults.firstInningsScale;
  const chaseScale =
    chaseN > 0
      ? Number(clamp((chaseResid / chaseN) * 0.9 || defaults.chaseScale, 12, 28).toFixed(2))
      : defaults.chaseScale;
  return {
    applied: true,
    sampleSize: rows.length,
    firstInningsScale,
    chaseScale,
    chaseWicketBonus: defaults.chaseWicketBonus,
  };
}
