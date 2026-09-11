import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service.js';

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
  agent: request.SuperTest<request.Test>;
}

class MockRedisService {
  async get<T = unknown>(): Promise<T | null> { return null; }
  async hgetall(): Promise<Record<string, string>> { return {}; }
  async smembers(): Promise<string[]> { return []; }
  get cached() {
    return {
      get: async () => null,
      set: async () => null,
      del: async () => null,
      smembers: async () => [],
      sadd: async () => null,
      srem: async () => null,
      keys: async () => [],
      ping: async () => 'PONG',
    };
  }
  get subscriber() {
    return {
      on: () => {},
      subscribe: async () => {},
      unsubscribe: async () => {},
    };
  }
}

export async function setupTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue({
      get: (key: string, fallback?: any) => {
        const overrides: Record<string, any> = {
          API_KEY: '',
          RATE_LIMIT_TTL: 60,
          RATE_LIMIT_MAX: 1000,
        };
        return key in overrides ? overrides[key] : fallback;
      },
    })
    .overrideProvider(RedisService)
    .useClass(MockRedisService)
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  const prisma = app.get(PrismaService);
  const agent = request(app.getHttpServer()) as unknown as request.SuperTest<request.Test>;

  return { app, prisma, agent };
}

export async function teardownTestApp(ctx: TestContext): Promise<void> {
  await ctx.app.close();
}

/**
 * Truncate all data tables (excluding Prisma's internal _migrations table).
 * Useful for cleaning state between test suites.
 */
export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  const tables = [
    'prediction_results',
    'prediction_features',
    'prediction_runs',
    'notification_logs',
    'share_stats',
    'news_article_players',
    'news_article_teams',
    'news_article_matches',
    'news_article_series',
    'reactions',
    'comment_reports',
    'comments',
    'favorites',
    'devices',
    'email_verification_tokens',
    'password_reset_tokens',
    'news_articles',
    'authors',
    'news_categories',
    'live_streams',
    'match_timelines',
    'head_to_head',
    'team_profiles',
    'player_profiles',
    'sport_event_records',
    'tournament_seasons',
    'tournaments',
    'tours',
    'psl_leaders',
    'psl_fixtures',
    'psl_standings',
    'players',
    'teams',
    'matches',
    'users',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch {
      // Table may not exist until scripts/migrate-priorities.js has been applied.
    }
  }
}
