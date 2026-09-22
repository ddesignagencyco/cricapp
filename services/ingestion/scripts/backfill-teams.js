/**
 * One-shot: merge team_profiles + match_lineup data into teams (country, manager).
 * Usage: node --env-file-if-exists=.env scripts/backfill-teams.js
 */
import {
  backfillTeamFieldsFromProfiles,
  backfillTeamFieldsFromLineups,
  backfillTeamFieldsFromSportEvents,
  backfillTeamManagersFromPlayers,
} from '../src/store.js';
import { shutdown as shutdownDb } from '../src/db.js';
import { shutdown as shutdownRedis } from '../src/redis.js';

const events = await backfillTeamFieldsFromSportEvents({ limit: 800 });
const profiles = await backfillTeamFieldsFromProfiles();
const lineups = await backfillTeamFieldsFromLineups({ limit: 200 });
const managers = await backfillTeamManagersFromPlayers();
console.log(`events=${events} profiles=${profiles} lineup_team_rows=${lineups} managers=${managers}`);
await shutdownRedis();
await shutdownDb();
