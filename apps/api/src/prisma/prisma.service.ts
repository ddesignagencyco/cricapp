import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { pgConnectionFromUrl } from './pg-connection.js';

/**
 * Prisma 7 connects through the `pg` driver adapter. The URL is the runtime
 * (pooled) DATABASE_URL; migrations use DIRECT_URL via prisma.config.ts.
 */
function createAdapter(): PrismaPg {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const { pool, schema } = pgConnectionFromUrl(databaseUrl);
  return new PrismaPg(pool, schema ? { schema } : undefined);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: createAdapter() });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
