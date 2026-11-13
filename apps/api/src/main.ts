import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { LandingService } from './landing/landing.service.js';
import { RequestMetricsService } from './common/request-metrics.service.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  const configuredOrigins = process.env.CORS_ORIGINS?.trim();
  app.enableCors({
    // Credentialed requests cannot use Access-Control-Allow-Origin: *.
    // Reflect the request origin in development, otherwise use the allowlist.
    origin:
      !configuredOrigins || configuredOrigins === '*'
        ? true
        : configuredOrigins.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('CricApp API')
    .setDescription(
      'Read API for cricket matches, teams and players. Data is persisted by the ingestion service from Sportradar.',
    )
    .setVersion('0.1.0')
    .addTag('matches', 'Live, upcoming and completed matches')
    .addTag('teams', 'Team profiles, rosters, schedules and results')
    .addTag('players', 'Player profiles and search')
    .addTag('live', 'Server-Sent Events for live match updates')
    .addTag('psl', 'Pakistan Super League records (standings, schedule, leaders, squads)')
    .addTag('tours', 'Cricket tours')
    .addTag('tournaments', 'Tournaments, seasons and tournament results')
    .addTag('schedules', 'Daily schedules and results')
    .addTag('head-to-head', 'Team versus team meetings')
    .addTag('auth', 'Signup, login and current user profile')
    .addTag('news', 'Admin-managed news articles and categories')
    .addTag('authors', 'Public editorial author profiles')
    .addTag('editorial', 'Editorial and correction policy content')
    .addTag('streams', 'Live stream metadata')
    .addTag('sharing', 'Share links with OG meta')
    .addTag('favorites', 'User favorites / bookmarks')
    .addTag('comments', 'Comments and reactions')
    .addTag('notifications', 'FCM device registration and notification preferences')
    .addTag('search', 'Unified search across players, teams, matches and tournaments')
    .addTag('predictions', 'Pre-match and live statistical winner probabilities')
    .addTag('odds', 'Licensed odds comparison, movement and conversion tools')
    .addTag('assistant', 'Retrieve-then-explain cricket Q&A from stored sports data')
    .addTag('admin', 'Admin CMS, moderation and platform analytics')
    .addTag('newsletter', 'Newsletter subscription management')
    .addTag('contact', 'Contact-us submissions')
    .addTag('gallery', 'Images, shorts and videos')
    .addTag('site-settings', 'Public contact, social and advertisement settings')
    .addTag('adsense', 'AdSense ad units, earnings reports and policy issues (admin)')
    .addCookieAuth('cricapp_access_token', {
      type: 'apiKey',
      in: 'cookie',
      description: 'HttpOnly cookie set by POST /api/auth/login',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const landing = app.get(LandingService);
  landing.setApiSurface({
    paths: Object.keys(document.paths ?? {}).length,
    operations: Object.values(document.paths ?? {}).reduce(
      (total, pathItem) =>
        total +
        Object.keys(pathItem ?? {}).filter((key) =>
          ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(key),
        ).length,
      0,
    ),
    tags: (document.tags ?? []).map((tag) => tag.name).filter(Boolean),
  });

  // The Nest global prefix is `/api`, which would put a controller's root route
  // at `/api` instead of `/`. The public landing page is registered on the
  // underlying Express instance before Nest mounts its 404 handler, so the bare
  // origin serves it while every Nest route keeps the `/api` contract.
  const metrics = app.get(RequestMetricsService);
  const http = app.getHttpAdapter().getInstance() as {
    get(path: string, handler: (req: unknown, res: any) => void): void;
  };
  http.get('/', (_req, res) => {
    const started = Date.now();
    res.on('finish', () => metrics.record(res.statusCode ?? 500, Date.now() - started));

    landing
      .render()
      .then((html) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end(html);
      })
      .catch((error: unknown) => {
        logger.error(
          `Landing page failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('CriczApp API is running. See /api for health or /docs for the API reference.');
      });
  });

  app.enableShutdownHooks();

  const port = parseInt(process.env.API_PORT ?? '3001', 10);
  await app.listen(port);
  logger.log(`@cricapp/api listening on http://localhost:${port}/api`);
  logger.log(`Developer landing page: http://localhost:${port}/`);
  logger.log(`Swagger UI: http://localhost:${port}/docs`);
}

void bootstrap();
