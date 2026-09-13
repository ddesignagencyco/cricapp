import { Client } from 'pg';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const sourceUrl = process.env.DATABASE_URL;

if (!sourceUrl) {
  throw new Error('DATABASE_URL is required to prepare the integration-test database');
}

const source = new URL(sourceUrl);
const sourceDatabase = source.pathname.slice(1);
const testDatabase =
  process.env.TEST_DATABASE_NAME ||
  (process.env.TEST_DATABASE_URL
    ? new URL(process.env.TEST_DATABASE_URL).pathname.slice(1)
    : `${sourceDatabase}_test`);

if (!/^[a-zA-Z0-9_]+$/.test(testDatabase)) {
  throw new Error('TEST_DATABASE_NAME may only contain letters, numbers, and underscores');
}

const testUrl = new URL(process.env.TEST_DATABASE_URL || sourceUrl);
if (!process.env.TEST_DATABASE_URL) testUrl.pathname = `/${testDatabase}`;

if (testUrl.toString() === sourceUrl) {
  throw new Error('Refusing to run integration tests against the development database');
}

const adminUrl = new URL(sourceUrl);
const admin = new Client({ connectionString: adminUrl.toString() });

await admin.connect();
try {
  const existing = await admin.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [testDatabase],
  );
  if (existing.rowCount !== 0) {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
      [testDatabase],
    );
    await admin.query(`DROP DATABASE "${testDatabase}"`);
  }
  await admin.query(`CREATE DATABASE "${testDatabase}"`);
} finally {
  await admin.end();
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testUrl.toString(),
};

// The matches table is owned by ingestion and intentionally predates Prisma.
const testClient = new Client({ connectionString: testUrl.toString() });
await testClient.connect();
try {
  const ingestionSchema = await readFile(
    new URL('../../../services/ingestion/data/init.sql', import.meta.url),
    'utf8',
  );
  await testClient.query(ingestionSchema);
  const baselineMigration = await readFile(
    new URL(
      '../prisma/migrations/20260901000000_init/migration.sql',
      import.meta.url,
    ),
    'utf8',
  );
  await testClient.query(baselineMigration);
} finally {
  await testClient.end();
}

const resolveResult = spawnSync(
  process.execPath,
  [
    require.resolve('prisma/build/index.js'),
    'migrate',
    'resolve',
    '--applied',
    '20260901000000_init',
  ],
  { cwd: process.cwd(), env, stdio: 'inherit' },
);
if (resolveResult.status !== 0) process.exit(resolveResult.status ?? 1);

const prismaResult = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
  { cwd: process.cwd(), env, stdio: 'inherit' },
);
if (prismaResult.status !== 0) process.exit(prismaResult.status ?? 1);

const jestResult = spawnSync(
  process.execPath,
  [
    require.resolve('jest/bin/jest'),
    '--passWithNoTests',
    '--forceExit',
    '--runInBand',
    ...process.argv.slice(2),
  ],
  { cwd: process.cwd(), env, stdio: 'inherit' },
);
process.exit(jestResult.status ?? 1);
