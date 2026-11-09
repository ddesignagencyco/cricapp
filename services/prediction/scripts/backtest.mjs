#!/usr/bin/env node
/**
 * Train the prematch model on stored history.
 *
 *   npm run backtest                 replay, persist settled predictions, recalibrate, report
 *   npm run backtest -- --dry-run    replay and report only (writes nothing)
 *
 * See src/backtest.js for why only point-in-time inputs are used.
 */
import { query, shutdown as shutdownDb } from '../src/db.js';
import { shutdown as shutdownRedis } from '../src/redis.js';
import { replayHistory, holdoutReport } from '../src/backtest.js';
import { recalibrateAllFormats } from '../src/calibrate.js';
import { refreshRatings } from '../src/ratings.js';

const dryRun = process.argv.includes('--dry-run');
try {
  await refreshRatings(query);
  const { points, skipped, settledMatches } = await replayHistory({ query, dryRun });
  console.log(`replayed ${points.length} of ${settledMatches} finished matches`, skipped);
  const report = holdoutReport(points);
  console.log('\nout-of-sample (newest 30%, never seen by the fit):');
  console.log(JSON.stringify(report, null, 2));
  if (!dryRun && points.length) {
    const fit = await recalibrateAllFormats(query);
    console.log('\nrecalibrated on all replayed matches:');
    console.log(JSON.stringify({ global: fit.global, weights: fit.weights }, null, 2));
  }
} finally {
  await shutdownRedis().catch(() => {});
  await shutdownDb();
}
