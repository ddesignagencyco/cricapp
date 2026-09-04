import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { PlayersModule } from './players/players.module.js';
import { LiveModule } from './live/live.module.js';
import { HealthModule } from './health/health.module.js';
import { PslModule } from './psl/psl.module.js';
import { ApiKeyGuard } from './auth/api-key.guard.js';
import { RequestLogger } from './common/request-logger.middleware.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        throttlers: [
          {
            ttl: cfg.get('RATE_LIMIT_TTL', 60) * 1000,
            limit: cfg.get('RATE_LIMIT_MAX', 100),
          },
        ],
      }),
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    MatchesModule,
    TeamsModule,
    PlayersModule,
    LiveModule,
    PslModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLogger).forRoutes('*');
  }
}
