/**
 * One-time baseline when DATABASE_URL points at a DB built outside Prisma Migrate
 * (e.g. ingestion init.sql). Marks every migration folder as applied without running SQL.
 *
 * Usage: node --env-file-if-exists=.env scripts/baseline-existing-db.mjs
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const apiRoot = fileURLToPath(new URL('..', import.meta.url));

const require = createRequire(import.meta.url);
const prismaCli = require.resolve('prisma/build/index.js');
const migrationsDir = new URL('../prisma/migrations/', import.meta.url);

const names = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let applied = new Set();
try {
  const r = await client.query(
    `SELECT migration_name FROM _prisma_migrations WHERE rolled_back_at IS NULL`,
  );
  applied = new Set(r.rows.map((row) => row.migration_name));
} catch {
  applied = new Set();
} finally {
  await client.end();
}

for (const name of names) {
  if (applied.has(name)) {
    console.log(`skip (already applied): ${name}`);
    continue;
  }
  console.log(`resolve: ${name}`);
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'migrate', 'resolve', '--applied', name],
    { cwd: apiRoot, env: process.env, stdio: 'inherit' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log('Done. Run: npx prisma migrate deploy');
