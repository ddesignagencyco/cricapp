import { describe, expect, it, jest } from '@jest/globals';
import { PREDICTION_MODELS } from '@cricapp/shared-types';
import { PredictionsService } from './predictions.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RedisService } from '../redis/redis.service.js';
import type { PredictionNarrativeService } from './prediction-narrative.service.js';

/** In-memory stand-in for the RedisService surface the performance cache uses. */
function fakeRedis() {
  const store = new Map<string, string>();
  const set = jest.fn(async (key: string, value: string) => {
    store.set(key, value);
    return 'OK';
  });
  const redis = {
    get: async (key: string) => (store.has(key) ? JSON.parse(store.get(key)!) : null),
    cached: { set },
  } as unknown as RedisService;
  return { redis, set };
}

function fakePrisma() {
  // First raw query: latest run per completed match; second: stored event payloads.
  const queryRaw = jest.fn(async (strings: TemplateStringsArray) =>
    strings.join('').includes('sport_event_records')
      ? [{ eventId: 'sr:match:1', payload: { sport_event_status: { winner_id: 'sr:competitor:1' } } }]
      : [
          {
            matchId: 'sr:match:1',
            tournament: 'Pakistan Super League',
            matchStatus: 'ended',
            homeWinProb: 0.62,
            confidence: 0.7,
            homeTeamId: 'sr:competitor:1',
            awayTeamId: 'sr:competitor:2',
            format: null,
          },
        ],
  );
  return { prisma: { $queryRaw: queryRaw } as unknown as PrismaService, queryRaw };
}

describe('PredictionsService.getPerformance', () => {
  it('computes once, then serves the identical payload from the cache', async () => {
    const { prisma, queryRaw } = fakePrisma();
    const { redis, set } = fakeRedis();
    const service = new PredictionsService(prisma, {} as PredictionNarrativeService, redis);

    const first = await service.getPerformance({});
    expect(first).toMatchObject({
      modelVersion: PREDICTION_MODELS.PREMATCH,
      stage: 'pre_match',
      sampleSize: 1,
      accuracy: 1,
      claimReady: false,
      byFormat: [expect.objectContaining({ format: 't20', sampleSize: 1 })],
    });
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith(
      `predictions:performance:pre_match:${PREDICTION_MODELS.PREMATCH}:10`,
      expect.any(String),
      'EX',
      expect.any(Number),
    );

    const second = await service.getPerformance({});
    expect(second).toEqual(first);
    expect(queryRaw).toHaveBeenCalledTimes(2);
  });

  it('still answers when Redis is unavailable', async () => {
    const { prisma } = fakePrisma();
    const redis = {
      get: async () => {
        throw new Error('ECONNREFUSED');
      },
      cached: {
        set: async () => {
          throw new Error('ECONNREFUSED');
        },
      },
    } as unknown as RedisService;
    const service = new PredictionsService(prisma, {} as PredictionNarrativeService, redis);
    await expect(service.getPerformance({ stage: 'live' })).resolves.toMatchObject({
      stage: 'live',
      sampleSize: 1,
    });
  });
});
