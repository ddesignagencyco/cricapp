/**
 * Merge lineup + profile payloads into players (country_code, styles, height, etc.).
 * Usage: node --env-file-if-exists=.env scripts/backfill-players.js
 */
import {
  backfillPlayerFieldsFromLineups,
  backfillPlayerFieldsFromProfiles,
} from '../src/store.js';
import { shutdown as shutdownDb } from '../src/db.js';
import { shutdown as shutdownRedis } from '../src/redis.js';

const lineups = await backfillPlayerFieldsFromLineups({ limit: 200 });
const profiles = await backfillPlayerFieldsFromProfiles();
console.log(`lineup_rows=${lineups} profiles=${profiles}`);
await shutdownRedis();
await shutdownDb();
