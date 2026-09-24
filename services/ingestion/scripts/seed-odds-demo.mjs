/**
 * Dev/demo only — seeds licensed demo bookmakers for one match.
 * Usage: node --env-file-if-exists=.env scripts/seed-odds-demo.mjs sr:match:YOUR_ID
 */
import { seedMatchWinnerSnapshots } from '../src/oddsStore.js';

const matchId = process.argv[2];
if (!matchId) {
  console.error('Usage: seed-odds-demo.mjs <matchId>');
  process.exit(1);
}

const now = new Date();
const hourAgo = new Date(now.getTime() - 3600000);

await seedMatchWinnerSnapshots({
  matchId,
  sourceSlug: 'demo-book-a',
  sourceName: 'Demo Book A (dev)',
  homeDecimal: 1.85,
  awayDecimal: 2.05,
  capturedAt: hourAgo,
});

await seedMatchWinnerSnapshots({
  matchId,
  sourceSlug: 'demo-book-a',
  sourceName: 'Demo Book A (dev)',
  homeDecimal: 1.9,
  awayDecimal: 1.98,
  capturedAt: now,
});

await seedMatchWinnerSnapshots({
  matchId,
  sourceSlug: 'demo-book-b',
  sourceName: 'Demo Book B (dev)',
  homeDecimal: 1.88,
  awayDecimal: 2.1,
  capturedAt: now,
});

console.log('Seeded demo odds for', matchId);
