/**
 * Database seed for @cricapp/api.
 *
 * NOTE: Nearly all runtime data (matches, teams, players, PSL records) is owned
 * and populated by the ingestion service (services/ingestion) from Sportradar,
 * so this seed intentionally writes no live/derived data.
 *
 * Its purpose is to (1) never crash when `prisma db seed` is invoked, and
 * (2) provide a stable place to add reference/lookup data as new models are
 * added to the schema. Idempotent by design - safe to run repeatedly.
 *
 * Extend it by adding a block per model, guarded by a count/check so re-runs
 * are harmless.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTeamsAndPlayers(): Promise<void> {
  // Reference data is provided by ingestion; nothing to do unless the tables
  // are empty. Extension point for adding canonical teams/players later.
  const teamCount = await prisma.team.count();
  console.log(`[seed] teams present: ${teamCount} (reference data owned by ingestion)`);
}

async function main(): Promise<void> {
  console.log('[seed] starting');
  await seedTeamsAndPlayers();
  console.log('[seed] done');
}

main()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
