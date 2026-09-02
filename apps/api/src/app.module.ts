import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { MatchesModule } from './matches/matches.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { PlayersModule } from './players/players.module.js';
import { LiveModule } from './live/live.module.js';
import { HealthModule } from './health/health.module.js';
import { PslModule } from './psl/psl.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    HealthModule,
    MatchesModule,
    TeamsModule,
    PlayersModule,
    LiveModule,
    PslModule,
  ],
})
export class AppModule {}
