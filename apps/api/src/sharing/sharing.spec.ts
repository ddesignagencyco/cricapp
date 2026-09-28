import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import {
  cleanDatabase,
  setupTestApp,
  teardownTestApp,
  type TestContext,
} from '../common/test-setup.js';

describe('SharingModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => teardownTestApp(ctx));

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('creates tour and tournament share links with entity metadata', async () => {
    await ctx.prisma.tour.create({
      data: { id: 'sr:tour:1', name: 'World Cricket Tour' },
    });
    await ctx.prisma.tournament.create({
      data: {
        id: 'sr:tournament:1',
        name: 'International Cup',
        type: 'international',
        gender: 'men',
      },
    });

    const tour = await ctx.agent.get('/share/tour/sr:tour:1').expect(200);
    expect(tour.body.url).toContain('/tours/sr:tour:1');
    expect(tour.body.ogTitle).toContain('World Cricket Tour');

    const tournament = await ctx.agent
      .get('/share/tournament/sr:tournament:1')
      .expect(200);
    expect(tournament.body.url).toContain(
      '/tournaments/sr:tournament:1',
    );
    expect(tournament.body.ogTitle).toContain('International Cup');

    const stats = await ctx.prisma.shareStat.findMany({
      orderBy: { shareType: 'asc' },
    });
    expect(stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ shareType: 'tour', count: 1 }),
        expect.objectContaining({ shareType: 'tournament', count: 1 }),
      ]),
    );
  });

  it('creates a gallery share link with media metadata', async () => {
    await ctx.prisma.galleryMedia.create({
      data: {
        id: 'gallery-1',
        title: 'PSL Final',
        caption: 'The winning moment at the final.',
        type: 'image',
        purpose: 'gallery',
        url: 'https://res.cloudinary.com/example/image/upload/v1/psl-final.jpg',
        publicId: 'cricapp/gallery/psl-final',
        resourceType: 'image',
        format: 'jpg',
      },
    });

    const res = await ctx.agent.get('/share/gallery/gallery-1').expect(200);
    expect(res.body.url).toContain('/gallery/gallery-1');
    expect(res.body.ogTitle).toContain('PSL Final');
    expect(res.body.ogDescription).toContain('winning moment');
    expect(res.body.ogImage).toContain('psl-final.jpg');

    const stats = await ctx.prisma.shareStat.findFirst({
      where: { shareType: 'gallery', targetId: 'gallery-1' },
    });
    expect(stats?.count).toBe(1);
  });

  it('creates a share link for an unpublished (editorial) gallery item', async () => {
    await ctx.prisma.galleryMedia.create({
      data: {
        id: 'gallery-editorial',
        title: 'News cover',
        type: 'image',
        purpose: 'editorial',
        url: 'https://res.cloudinary.com/example/image/upload/v1/cover.jpg',
        publicId: 'cricapp/articles/cover',
        resourceType: 'image',
        format: 'jpg',
      },
    });

    const res = await ctx.agent.get('/share/gallery/gallery-editorial').expect(200);
    expect(res.body.url).toContain('/gallery/gallery-editorial');
  });

  it('rejects unsupported share types without tracking them', async () => {
    await ctx.agent.get('/share/profile/anything').expect(400);
    expect(await ctx.prisma.shareStat.count()).toBe(0);
  });
});
