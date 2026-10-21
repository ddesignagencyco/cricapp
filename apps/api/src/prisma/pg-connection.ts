import { readFileSync } from 'node:fs';
import type { PoolConfig } from 'pg';

/** Prisma-only URL options that the `pg` driver must not receive. */
const PRISMA_ONLY_PARAMS = ['pgbouncer', 'connection_limit', 'pool_timeout', 'connect_timeout', 'schema', 'statement_cache_size', 'socket_timeout'];

export type PgConnection = { pool: PoolConfig; schema?: string };

/** PEM text from DATABASE_SSL_CA: the certificate itself, or a path to it. */
function loadCa(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (raw.includes('-----BEGIN')) return raw.replace(/\\n/g, '\n');
  return readFileSync(raw, 'utf8');
}

/**
 * Turns a DATABASE_URL written for Prisma ≤6 into a `pg` pool config for the
 * Prisma 7 driver adapter, keeping the old behaviour:
 *
 * - `sslmode=require|prefer` encrypts without verifying the certificate, as the
 *   Rust engine did. node-pg treats `require` as full verification, which rejects
 *   Supabase's pooler certificate (P1010). Set DATABASE_SSL_CA to verify properly.
 * - `connection_limit` becomes the pool size, `connect_timeout` (seconds, default 5
 *   as in Prisma ≤6) the connect timeout, `schema` the adapter's schema.
 * - Prisma-only options (`pgbouncer`, …) are removed from the URL.
 */
export function pgConnectionFromUrl(databaseUrl: string, env: NodeJS.ProcessEnv = process.env): PgConnection {
  const url = new URL(databaseUrl);
  const params = url.searchParams;
  const sslmode = (params.get('sslmode') ?? '').toLowerCase();
  const limit = Number(params.get('connection_limit'));
  const connectTimeout = Number(params.get('connect_timeout'));
  const schema = params.get('schema') || undefined;

  params.delete('sslmode');
  for (const key of PRISMA_ONLY_PARAMS) params.delete(key);

  const ca = loadCa(env.DATABASE_SSL_CA);
  let ssl: PoolConfig['ssl'];
  if (sslmode === 'disable' || (!sslmode && !ca)) ssl = undefined;
  else if (ca) ssl = { ca, rejectUnauthorized: true };
  else if (sslmode === 'verify-ca' || sslmode === 'verify-full') ssl = { rejectUnauthorized: true };
  else ssl = { rejectUnauthorized: false };

  return {
    pool: {
      connectionString: url.toString(),
      ssl,
      max: Number.isFinite(limit) && limit > 0 ? limit : 10,
      connectionTimeoutMillis: (Number.isFinite(connectTimeout) && connectTimeout > 0 ? connectTimeout : 5) * 1000,
    },
    schema,
  };
}
