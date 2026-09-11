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
});
