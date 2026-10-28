import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env by itself. Load apps/api/.env (next to this file,
// whatever the working directory: CI and Docker run from the repo root). Node's
// loader never overrides a value that is already set, so the test runner's
// isolated database URL still wins.
try {
  process.loadEnvFile(join(import.meta.dirname, '.env'));
} catch {
  // No .env (CI, Docker): the environment is provided by the platform.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Compiled by `npm run build` (tsconfig includes prisma/); `npm run prisma:seed` builds first.
    seed: 'node dist/prisma/seed.js',
  },
  datasource: {
    // Migrations must bypass Supabase's transaction-mode pooler, so the CLI uses
    // the direct connection (it was `directUrl` in the schema before Prisma 7).
    // Read directly, not with env(), so `prisma generate` works without a database.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
