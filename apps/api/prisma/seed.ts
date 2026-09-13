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
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedTeamsAndPlayers(): Promise<void> {
  // Reference data is provided by ingestion; nothing to do unless the tables
  // are empty. Extension point for adding canonical teams/players later.
  const teamCount = await prisma.team.count();
  console.log(`[seed] teams present: ${teamCount} (reference data owned by ingestion)`);
}

async function seedSuperAdmin(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) {
    console.log('[seed] SUPERADMIN_EMAIL/PASSWORD not set; skipping owner account');
    return;
  }

  const username =
    process.env.SUPERADMIN_USERNAME?.trim() || 'superadmin';
  const passwordHash = await bcrypt.hash(password, 12);

  // Only one row may carry is_super_admin, so hand the role over explicitly.
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { isSuperAdmin: true, email: { not: email } },
      data: { isSuperAdmin: false },
    });
    await tx.user.upsert({
      where: { email },
      update: {
        passwordHash,
        isAdmin: true,
        isSuperAdmin: true,
        emailVerified: true,
      },
      create: {
        email,
        username,
        passwordHash,
        displayName: 'CricApp Superadmin',
        isAdmin: true,
        isSuperAdmin: true,
        emailVerified: true,
      },
    });
  });
  console.log(`[seed] superadmin ready: ${email}`);
}

async function main(): Promise<void> {
  console.log('[seed] starting');
  await seedSuperAdmin();
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
