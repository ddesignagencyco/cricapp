import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import {
  cleanDatabase,
  setupTestApp,
  teardownTestApp,
  type TestContext,
} from '../common/test-setup.js';

describe('GalleryModule (integration)', () => {
  let ctx: TestContext;
  let adminToken: string;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => teardownTestApp(ctx));

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    const admin = await ctx.prisma.user.create({
      data: {
        email: 'admin@example.com',
        username: 'admin',
        passwordHash: 'unused',
        emailVerified: true,
        isAdmin: true,
      },
    });
    adminToken = ctx.app.get(JwtService).sign({
      sub: admin.id,
      email: admin.email,
      username: admin.username,
      isAdmin: true,
      isSuperAdmin: false,
      emailVerified: true,
    });
  });

  it('lists and filters gallery media by type', async () => {
    await ctx.prisma.galleryMedia.createMany({
      data: [
        {
          type: 'image',
          url: 'https://cdn.example.com/image.jpg',
          publicId: 'gallery/image',
          resourceType: 'image',
        },
        {
          type: 'short',
          url: 'https://cdn.example.com/short.mp4',
          publicId: 'gallery/short',
          resourceType: 'video',
          duration: 20,
        },
      ],
    });

    const response = await ctx.agent.get('/gallery?type=short').expect(200);
    expect(response.body.meta.totalRecords).toBe(1);
    expect(response.body.data[0].type).toBe('short');
    expect(response.body.data[0].duration).toBe(20);
  });

  it('excludes media reused by profiles or editorial content', async () => {
    const visible = await ctx.prisma.galleryMedia.create({
      data: {
        type: 'image',
        url: 'https://cdn.example.com/gallery-only.jpg',
        publicId: 'gallery/visible',
        resourceType: 'image',
      },
    });
    const profile = await ctx.prisma.galleryMedia.create({
      data: {
        type: 'image',
        url: 'https://cdn.example.com/profile.jpg',
        publicId: 'gallery/profile',
        resourceType: 'image',
      },
    });
    const article = await ctx.prisma.galleryMedia.create({
      data: {
        type: 'image',
        url: 'https://cdn.example.com/article.jpg',
        publicId: 'gallery/article',
        resourceType: 'image',
      },
    });
    await ctx.prisma.user.update({
      where: { email: 'admin@example.com' },
      data: { avatarUrl: profile.url },
    });
    await ctx.prisma.newsArticle.create({
      data: {
        title: 'Article with image',
        slug: 'article-with-image',
        content: 'Body',
        imageUrl: article.url,
      },
    });

    const response = await ctx.agent.get('/gallery').expect(200);
    expect(response.body.meta.totalRecords).toBe(1);
    expect(response.body.data[0].id).toBe(visible.id);
    await ctx.agent.get(`/gallery/${profile.id}`).expect(404);
    await ctx.agent.get(`/gallery/${article.id}`).expect(404);
  });

  it('requires matching media type before a Cloudinary upload', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    const response = await ctx.agent
      .post('/gallery')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('type', 'video')
      .attach('file', png, {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(400);
    expect(response.body.message).toContain('requires a video file');
  });

  it('protects gallery uploads from anonymous clients', async () => {
    await ctx.agent
      .post('/gallery')
      .field('type', 'image')
      .attach('file', Buffer.from('fake image bytes'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(401);
  });
});
