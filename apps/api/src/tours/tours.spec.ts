import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  setupTestApp,
  teardownTestApp,
  cleanDatabase,
  type TestContext,
} from '../common/test-setup.js';

describe('ToursModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    await ctx.prisma.tour.createMany({
      data: [
        { id: 'tour-1', name: 'A Tour' },
        { id: 'tour-2', name: 'B Tour' },
        { id: 'tour-3', name: 'C Tour' },
      ],
    });
  });

  it('GET /tours — returns the standard paginated response', async () => {
    const response = await ctx.agent
      .get('/tours?page=2&limit=2')
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe('tour-3');
    expect(response.body.meta).toMatchObject({
      page: 2,
      limit: 2,
      totalRecords: 3,
      totalPages: 2,
      hasNextPage: false,
      hasPrevPage: true,
    });
  });

  it('GET /tours?q= — searches by name or country code and counts tournaments', async () => {
    await ctx.prisma.tour.create({
      data: {
        id: 'cat:sr:category:9',
        name: 'Pakistan',
        category: { id: 'sr:category:9', name: 'Pakistan', country_code: 'PAK' },
      },
    });
    await ctx.prisma.tournament.createMany({
      data: [
        { id: 't-1', name: 'Pakistan Super League', category: { id: 'sr:category:9', name: 'Pakistan' } },
        { id: 't-2', name: 'Quaid-e-Azam Trophy', category: { id: 'sr:category:9', name: 'Pakistan' } },
        { id: 't-3', name: 'Elsewhere Cup', category: { id: 'sr:category:1', name: 'Other' } },
      ],
    });

    const byName = await ctx.agent.get('/tours?q=paki').expect(200);
    expect(byName.body.data).toHaveLength(1);
    expect(byName.body.data[0]).toMatchObject({ name: 'Pakistan', tournamentCount: 2 });

    const byCode = await ctx.agent.get('/tours?q=pak').expect(200);
    expect(byCode.body.data.map((t: { id: string }) => t.id)).toEqual(['cat:sr:category:9']);

    const all = await ctx.agent.get('/tours').expect(200);
    expect(all.body.data.find((t: { id: string }) => t.id === 'tour-1').tournamentCount).toBe(0);
  });
});
