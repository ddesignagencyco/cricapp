import { Module } from '@nestjs/common';
import { LandingService } from './landing.service.js';

/**
 * The public landing page is mounted directly on the HTTP adapter in `main.ts`
 * because Nest's global `/api` prefix would otherwise move it to `/api`.
 * Keeping the service in a module lets it use Prisma, Redis and the request
 * metrics through normal dependency injection.
 */
@Module({
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
