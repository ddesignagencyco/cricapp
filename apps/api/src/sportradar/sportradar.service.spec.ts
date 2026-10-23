import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SportradarService } from './sportradar.service.js';

const configStub = { get: (key: string) => (key === 'SPORTRADAR_API_KEY' ? 'test-key' : undefined) } as unknown as ConfigService;

const realFetch = globalThis.fetch;

function stubFetch(status: number, body: unknown = {}): void {
  globalThis.fetch = jest.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe('SportradarService error mapping', () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('maps an upstream 404 on a match timeline to NotFoundException', async () => {
    stubFetch(404);
    await expect(new SportradarService(configStub).fetchMatchTimeline('sr:match:1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('keeps upstream outages as ServiceUnavailableException', async () => {
    stubFetch(502);
    await expect(new SportradarService(configStub).fetchMatchTimeline('sr:match:1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('keeps a head-to-head 404 as ServiceUnavailableException (callers treat it as "no data")', async () => {
    stubFetch(404);
    await expect(
      new SportradarService(configStub).fetchTeamVersusTeam('sr:competitor:1', 'sr:competitor:2'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps network failures to ServiceUnavailableException', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('ECONNRESET');
    }) as unknown as typeof fetch;
    await expect(new SportradarService(configStub).fetchMatchTimeline('sr:match:1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns the JSON body on success', async () => {
    stubFetch(200, { timeline: [] });
    await expect(new SportradarService(configStub).fetchMatchTimeline('sr:match:1')).resolves.toEqual({
      timeline: [],
    });
  });
});
