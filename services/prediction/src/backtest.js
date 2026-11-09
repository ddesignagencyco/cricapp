import { PREDICTION_MODELS, PREDICTION_STAGE } from '@cricapp/shared-types';
import { extractPrematchFeatures } from './features.js';
import { scorePrematch } from './prematch.js';
import { computeEloRatings, loadSettledMatchRows, settledMatchesFromRows } from './ratings.js';
import { defaultPrematchWeights, edgesFromExplanation, fitPrematchWeights, logitFromEdges } from './weights.js';
import { fitPlattCalibration, brierScore } from './settle.js';
import { persistPrediction } from './persist.js';

/**
 * Replaying history to train the model.
 *
 * The service learns (calibration, weights) from predictions that were made before a match and
 * settled after it. There are no such predictions for matches played before the service ran,
 * so they are reconstructed: every finished match is predicted again from only what was known
 * just before it, then compared with what happened.
 *
 * "Known before" is the whole point, so only time-aware inputs are used: results before the
 * match (form, head to head) and Elo ratings built from earlier games alone. Inputs that exist
 * only as today's snapshot (the table, squads, venue history, toss trends) are left out; using
 * them would let the future leak into the past and flatter the model.
 */

const MODEL = PREDICTION_MODELS.PREMATCH;

/** Elo ratings as they stood after `earlier` (finished matches, oldest first). */
export function ratingsAsOf(earlier) {
  const byKey = new Map();
  for (const r of computeEloRatings(earlier)) byKey.set(`${r.format}|${r.teamId}`, r);
  // same lookup order as the live loader: the match's own format, else the unspecified bucket
  return (teamId, format) => byKey.get(`${format}|${teamId}`) ?? byKey.get(`*|${teamId}`) ?? null;
}

/** Brier score and accuracy of home-win probabilities against outcomes. */
export function evaluate(points) {
  const scored = points.filter((p) => p.homeWon === true || p.homeWon === false);
  if (!scored.length) return { n: 0, brier: null, accuracy: null };
  let brier = 0;
  let correct = 0;
  for (const p of scored) {
    brier += brierScore(p.prob, p.homeWon);
    if (p.prob !== 0.5 && (p.prob > 0.5) === p.homeWon) correct += 1;
  }
  return { n: scored.length, brier: Number((brier / scored.length).toFixed(4)), accuracy: Number((correct / scored.length).toFixed(4)) };
}

/**
 * Replay finished matches in date order. `deps` are injectable so the ordering and the
 * no-leak guarantee can be tested without a database.
 */
export async function replayHistory({
  query,
  redis = null,
  limit = Infinity,
  dryRun = false,
  deps = {},
}) {
  const extract = deps.extract ?? extractPrematchFeatures;
  const persist = deps.persist ?? persistPrediction;
  const rows = deps.rows ?? (await loadSettledMatchRows(query));
  const settled = settledMatchesFromRows(rows).filter((m) => m.scheduled);

  const already = deps.already ?? new Set(
    (
      await query(
        `SELECT DISTINCT match_id FROM prediction_runs WHERE stage = $1 AND model_version = $2`,
        [PREDICTION_STAGE.PRE_MATCH, MODEL],
      )
    ).rows.map((r) => r.match_id),
  );

  const points = [];
  const skipped = { undecided: 0, alreadyPredicted: 0, noHistory: 0, noMatch: 0 };
  for (let i = 0; i < settled.length && points.length < limit; i += 1) {
    const match = settled[i];
    if (match.homeWon == null) {
      skipped.undecided += 1;
      continue;
    }
    if (already.has(match.matchId)) {
      skipped.alreadyPredicted += 1;
      continue;
    }
    const ratings = ratingsAsOf(settled.slice(0, i));
    const snapshot = await extract(match.matchId, { query, redis, asOf: match.scheduled, ratings });
    if (!snapshot) {
      skipped.noMatch += 1;
      continue;
    }
    // Two sides with nothing behind them say nothing: a 50% there is no prediction to learn from.
    const informative =
      (snapshot.form?.homeN ?? 0) + (snapshot.form?.awayN ?? 0) > 0 || snapshot.elo || (snapshot.h2h?.meetings ?? 0) > 0;
    if (!informative) {
      skipped.noHistory += 1;
      continue;
    }
    // Raw model: the weights and calibration being learned must not shape their own training data.
    snapshot.calibration = { slope: 1, intercept: 0, source: 'backtest', format: snapshot.format };
    snapshot.weights = defaultPrematchWeights();
    const result = scorePrematch(snapshot);

    if (!dryRun) {
      await persist(query, {
        matchId: match.matchId,
        stage: PREDICTION_STAGE.PRE_MATCH,
        modelVersion: MODEL,
        snapshot,
        result,
        // as if made an hour before the start, so history reads in order
        createdAt: new Date(Date.parse(match.scheduled) - 3600e3).toISOString(),
      });
    }
    points.push({
      matchId: match.matchId,
      scheduled: match.scheduled,
      prob: result.homeWinProb,
      z: result.explanation.z,
      edges: edgesFromExplanation(result.explanation, snapshot),
      homeWon: match.homeWon,
      format: snapshot.format,
    });
  }
  return { points, skipped, settledMatches: settled.length };
}

/**
 * Honest out-of-sample numbers: fit calibration and weights on the older part of the replay
 * and judge them on the newest part, which they never saw.
 */
export function holdoutReport(points, { holdoutShare = 0.3 } = {}) {
  const ordered = [...points].sort((a, b) => String(a.scheduled).localeCompare(String(b.scheduled)));
  const cut = Math.floor(ordered.length * (1 - holdoutShare));
  const train = ordered.slice(0, cut);
  const test = ordered.slice(cut);
  // a 50% forecast is never "right", so only its Brier score (always 0.25) means anything
  const coinFlip = { brier: evaluate(test.map((p) => ({ prob: 0.5, homeWon: p.homeWon }))).brier, accuracy: null };

  const raw = evaluate(test.map((p) => ({ prob: p.prob, homeWon: p.homeWon })));
  const plattFit = fitPlattCalibration(train);
  const weightFit = fitPrematchWeights(train.map((p) => ({ edges: p.edges, homeWon: p.homeWon })), { minSamples: 30 });

  const sigmoid = (z) => 1 / (1 + Math.exp(-z));
  const calibrated = plattFit.applied === false
    ? null
    : evaluate(test.map((p) => ({ prob: sigmoid(plattFit.intercept + plattFit.slope * p.z), homeWon: p.homeWon })));
  const reweighted = weightFit.applied
    ? evaluate(test.map((p) => ({ prob: sigmoid(logitFromEdges(p.edges, weightFit.weights)), homeWon: p.homeWon })))
    : null;
  const homeAlways = evaluate(test.map((p) => ({ prob: 0.99, homeWon: p.homeWon })));

  return {
    train: train.length,
    test: test.length,
    coinFlip,
    alwaysHome: { brier: homeAlways.brier, accuracy: homeAlways.accuracy },
    rawModel: raw,
    calibrated,
    reweighted,
    fittedWeights: weightFit.applied ? weightFit.weights : null,
    fittedCalibration: plattFit.applied === false ? null : { slope: plattFit.slope, intercept: plattFit.intercept },
  };
}
