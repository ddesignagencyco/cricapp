import { describe, expect, it } from '@jest/globals';
import { pgConnectionFromUrl } from './pg-connection.js';

const supabasePooled =
  'postgresql://postgres.ref:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require';

describe('pgConnectionFromUrl', () => {
  it('keeps Prisma <=6 SSL behaviour: sslmode=require encrypts without verifying', () => {
    const { pool } = pgConnectionFromUrl(supabasePooled, {});
    expect(pool.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('verifies the certificate when DATABASE_SSL_CA is provided', () => {
    const ca = '-----BEGIN CERTIFICATE-----\\nMIIB\\n-----END CERTIFICATE-----';
    const { pool } = pgConnectionFromUrl(supabasePooled, { DATABASE_SSL_CA: ca });
    expect(pool.ssl).toEqual({ ca: '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----', rejectUnauthorized: true });
  });

  it('turns Prisma-only options into pool settings and strips them from the URL', () => {
    const { pool } = pgConnectionFromUrl(supabasePooled, {});
    expect(pool.max).toBe(1);
    expect(pool.connectionTimeoutMillis).toBe(5000);
    const url = new URL(String(pool.connectionString));
    expect([...url.searchParams.keys()]).toEqual([]);
    expect(url.port).toBe('6543');
  });

  it('defaults a local URL to no SSL, a pool of 10 and a 5s connect timeout', () => {
    const { pool, schema } = pgConnectionFromUrl('postgresql://cricapp:pw@localhost:5432/cricapp', {});
    expect(pool.ssl).toBeUndefined();
    expect(pool.max).toBe(10);
    expect(pool.connectionTimeoutMillis).toBe(5000);
    expect(schema).toBeUndefined();
  });

  it('passes ?schema= to the adapter and honours connect_timeout and verify-full', () => {
    const { pool, schema } = pgConnectionFromUrl(
      'postgresql://u:p@db.example.com:5432/app?schema=cricket&connect_timeout=12&sslmode=verify-full',
      {},
    );
    expect(schema).toBe('cricket');
    expect(pool.connectionTimeoutMillis).toBe(12000);
    expect(pool.ssl).toEqual({ rejectUnauthorized: true });
  });
});
