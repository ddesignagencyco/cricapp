import { describe, expect, it, jest } from '@jest/globals';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { MatchesService } from './matches.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RedisService } from '../redis/redis.service.js';
import type { SportradarService } from '../sportradar/sportradar.service.js';

/** No stored timeline or match row, so every request falls through to Sportradar. */
function serviceWith(fetchMatchTimeline: () => Promise<Record<string, unknown>>) {
  const prisma = {
    matchTimeline: { findUnique: async () => null },
    match: { findUnique: async () => null },
  } as unknown as PrismaService;
  const sportradar = { isConfigured: true, fetchMatchTimeline: jest.fn(fetchMatchTimeline) };
  const service = new MatchesService(
    prisma,
    {} as RedisService,
    sportradar as unknown as SportradarService,
  );
  return { service, sportradar };
}

describe('MatchesService.getTimeline error mapping', () => {
  it('returns 404 when Sportradar does not know the match', async () => {
    const { service } = serviceWith(async () => {
      throw new NotFoundException('Sportradar resource not found.');
    });
    await expect(service.getTimeline('sr:match:999999999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps a genuine upstream outage as 503', async () => {
    const { service } = serviceWith(async () => {
      throw new ServiceUnavailableException('Sportradar request failed (502).');
    });
    await expect(service.getTimeline('sr:match:999999999')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('answers 404 for a malformed id without calling Sportradar', async () => {
    const { service, sportradar } = serviceWith(async () => ({}));
    await expect(service.getTimeline('not-a-match')).rejects.toBeInstanceOf(NotFoundException);
    expect(sportradar.fetchMatchTimeline).not.toHaveBeenCalled();
  });
});
