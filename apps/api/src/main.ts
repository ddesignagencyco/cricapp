import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
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
    .addTag('teams', 'Team profiles and rosters')
    .addTag('players', 'Player profiles and search')
    .addTag('live', 'Server-Sent Events for live match updates')
    .addTag('psl', 'Pakistan Super League records (standings, schedule, leaders, squads)')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = parseInt(process.env.API_PORT ?? '3001', 10);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`@cricapp/api listening on http://localhost:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`Swagger UI: http://localhost:${port}/docs`);
}

void bootstrap();
