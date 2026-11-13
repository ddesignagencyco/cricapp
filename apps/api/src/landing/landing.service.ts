import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  RequestMetricsService,
  type RequestMetricsSnapshot,
} from '../common/request-metrics.service.js';
import { renderLandingPage } from './landing.page.js';

export type ServiceStatus =
  | 'operational'
  | 'degraded'
  | 'offline'
  | 'idle'
  | 'unconfigured'
  | 'unknown';

export interface LandingServiceCard {
  id: string;
  name: string;
  role: string;
  status: ServiceStatus;
  detail: string;
  meta: string;
}

export interface ApiSurface {
  paths: number;
  operations: number;
  tags: string[];
}

export interface LandingData {
  generatedAt: string;
  responseTimeMs: number;
  overall: 'operational' | 'degraded';
  services: LandingServiceCard[];
  runtime: {
    node: string;
    environment: string;
    region: string;
    service: string;
    commit: string | null;
    branch: string | null;
    platform: string;
    arch: string;
    pid: number;
    uptimeSeconds: number;
    startedAt: string;
    memoryRss: number;
    memoryHeapUsed: number;
    memoryHeapTotal: number;
  };
  database: {
    ok: boolean;
    latencyMs: number;
    version: string | null;
    latestMatchAt: string | null;
    counts: {
      matches: number;
      liveMatches: number;
      completedMatches: number;
      upcomingMatches: number;
      teams: number;
      players: number;
      tournaments: number;
      publishedArticles: number;
      users: number;
      predictions: number;
      gallery: number;
    } | null;
  };
  redis: {
    ok: boolean;
    latencyMs: number;
    version: string | null;
    liveSetSize: number;
    syncKeyCount: number;
    newsSyncedAt: string | null;
  };
  ingestion: {
    status: ServiceStatus;
    heartbeatAgeMs: number | null;
    liveCount: number | null;
    lastError: string | null;
  };
  prediction: {
    status: ServiceStatus;
    runs: number;
    latestRunAt: string | null;
    model: string | null;
    stage: string | null;
  };
  requests: RequestMetricsSnapshot;
  apiSurface: ApiSurface | null;
  baseUrl: string;
  docsUrl: string;
  openApiUrl: string;
  healthUrl: string;
  webUrl: string;
  config: {
    rateLimit: string;
    email: string;
    media: string;
    push: string;
    realtime: string;
  };
}

const DB_TIMEOUT_MS = 5000;
const REDIS_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function parseHeartbeat(raw: string | null): {
  ts: number | null;
  liveCount: number | null;
  error: string | null;
} {
  if (!raw) return { ts: null, liveCount: null, error: null };
  try {
    const parsed = JSON.parse(raw) as { ts?: number; liveCount?: number; error?: string };
    return {
      ts: typeof parsed.ts === 'number' ? parsed.ts : Number(raw) || null,
      liveCount: typeof parsed.liveCount === 'number' ? parsed.liveCount : null,
      error: typeof parsed.error === 'string' ? parsed.error : null,
    };
  } catch {
    const numeric = Number(raw);
    return { ts: Number.isFinite(numeric) ? numeric : null, liveCount: null, error: null };
  }
}

function postgresVersion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/PostgreSQL\s+[\d.]+/i);
  return match ? match[0] : null;
}

function redisVersion(info: string | null | undefined): string | null {
  if (!info) return null;
  const match = info.match(/redis_version:([^\r\n]+)/);
  return match ? `Redis ${match[1].trim()}` : null;
}

@Injectable()
export class LandingService {
  private readonly logger = new Logger(LandingService.name);
  private apiSurface: ApiSurface | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly metrics: RequestMetricsService,
    private readonly config: ConfigService,
  ) {}

  /** Filled by `main.ts` from the Swagger document so the page counts real routes. */
  setApiSurface(surface: ApiSurface): void {
    this.apiSurface = surface;
  }

  async render(): Promise<string> {
    const startedAt = Date.now();
    const data = await this.collect();
    data.responseTimeMs = Date.now() - startedAt;
    return renderLandingPage(data);
  }

  private async collect(): Promise<LandingData> {
    const now = Date.now();
    const [database, redisInfo] = await Promise.all([
      this.collectDatabase(),
      this.collectRedis(),
    ]);

    const ingestion = this.ingestionCard(redisInfo.heartbeat, now);
    const prediction = this.predictionCard(database.prediction);

    const services: LandingServiceCard[] = [
      {
        id: 'api',
        name: 'API server',
        role: 'NestJS · REST + validation',
        status: 'operational',
        detail: 'Serving every public and admin route',
        meta: `Node ${process.version.replace(/^v/, '')} · ${process.env.NODE_ENV ?? 'development'}`,
      },
      {
        id: 'postgres',
        name: 'PostgreSQL',
        role: 'Primary data store · Prisma',
        status: database.ok ? 'operational' : 'offline',
        detail: database.ok
          ? `${database.counts?.matches.toLocaleString('en-US') ?? '0'} matches indexed`
          : 'Database unreachable',
        meta: database.ok
          ? `${database.latencyMs}ms query · ${database.version ?? 'connected'}`
          : 'Health probe failed',
      },
      {
        id: 'redis',
        name: 'Redis',
        role: 'Cache · live bus · pub/sub',
        status: redisInfo.ok ? 'operational' : 'offline',
        detail: redisInfo.ok
          ? `${redisInfo.liveSetSize} live id${redisInfo.liveSetSize === 1 ? '' : 's'} in the live set`
          : 'Cache unavailable',
        meta: redisInfo.ok
          ? `${redisInfo.latencyMs}ms ping · ${redisInfo.version ?? 'connected'}`
          : 'Health probe failed',
      },
      {
        id: 'realtime',
        name: 'Realtime gateway',
        role: 'Socket.IO · SSE fan-out',
        status: redisInfo.ok ? 'operational' : 'degraded',
        detail: 'Match updates stream to connected clients',
        meta: redisInfo.ok ? 'namespace /matches · live:update' : 'Pub/sub unavailable',
      },
      {
        id: 'ingestion',
        name: 'Ingestion worker',
        role: 'Provider sync · normalise · diff',
        status: ingestion.status,
        detail:
          ingestion.status === 'operational'
            ? `Heartbeat ${this.secondsAgo(ingestion.heartbeatAgeMs)} · ${ingestion.liveCount ?? 0} live`
            : ingestion.status === 'degraded'
              ? `Heartbeat is stale (${this.secondsAgo(ingestion.heartbeatAgeMs)})`
              : 'No heartbeat from the ingestion worker',
        meta: 'Postgres writes · Redis publishes',
      },
      {
        id: 'prediction',
        name: 'Prediction worker',
        role: 'Prematch + live models',
        status: prediction.status,
        detail: prediction.detail,
        meta: prediction.meta,
      },
      {
        id: 'media',
        name: 'Media delivery',
        role: 'Cloudinary · images & video',
        status: this.config.get('CLOUDINARY_CLOUD_NAME') ? 'operational' : 'unconfigured',
        detail: this.config.get('CLOUDINARY_CLOUD_NAME')
          ? 'Signed uploads and delivery configured'
          : 'Cloudinary is not configured in this environment',
        meta: 'Article art · gallery · shorts',
      },
      {
        id: 'push',
        name: 'Push & email',
        role: 'FCM · transactional mail',
        status:
          this.config.get('FIREBASE_PROJECT_ID') || this.config.get('RESEND_API_KEY')
            ? 'operational'
            : 'unconfigured',
        detail:
          this.config.get('FIREBASE_PROJECT_ID') || this.config.get('RESEND_API_KEY')
            ? 'Notification channels configured'
            : 'No push or mail credentials in this environment',
        meta: `Email ${this.config.get('EMAIL_PROVIDER') ?? 'n/a'} · FCM ${
          this.config.get('FIREBASE_PROJECT_ID') ? 'on' : 'off'
        }`,
      },
    ];

    const attentionStatuses = new Set<ServiceStatus>(['degraded', 'offline', 'unknown']);
    const allHealthy =
      database.ok &&
      redisInfo.ok &&
      services.every((service) => !attentionStatuses.has(service.status));

    const port = this.config.get('API_PORT') ?? process.env.API_PORT ?? '3001';
    const isProduction = (process.env.NODE_ENV ?? '') === 'production';
    const origin = (
      process.env.RENDER_EXTERNAL_URL ??
      (isProduction ? 'https://cricapp-api.onrender.com' : `http://localhost:${port}`)
    ).replace(/\/$/, '');

    const memory = process.memoryUsage();
    const uptimeSeconds = Math.max(0, Math.round(process.uptime()));

    return {
      generatedAt: new Date().toISOString(),
      responseTimeMs: 0,
      overall: allHealthy ? 'operational' : 'degraded',
      services,
      runtime: {
        node: process.version,
        environment: process.env.NODE_ENV ?? 'development',
        region: process.env.RENDER_REGION ?? 'local',
        service: process.env.RENDER_SERVICE_NAME ?? 'cricapp-api',
        commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
        branch: process.env.RENDER_GIT_BRANCH ?? null,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptimeSeconds,
        startedAt: new Date(now - uptimeSeconds * 1000).toISOString(),
        memoryRss: memory.rss,
        memoryHeapUsed: memory.heapUsed,
        memoryHeapTotal: memory.heapTotal,
      },
      database: {
        ok: database.ok,
        latencyMs: database.latencyMs,
        version: database.version,
        latestMatchAt: database.latestMatchAt,
        counts: database.counts,
      },
      redis: {
        ok: redisInfo.ok,
        latencyMs: redisInfo.latencyMs,
        version: redisInfo.version,
        liveSetSize: redisInfo.liveSetSize,
        syncKeyCount: redisInfo.syncKeyCount,
        newsSyncedAt: redisInfo.newsSyncedAt,
      },
      ingestion: {
        status: ingestion.status,
        heartbeatAgeMs: ingestion.heartbeatAgeMs,
        liveCount: ingestion.liveCount,
        lastError: ingestion.lastError,
      },
      prediction: {
        status: prediction.status,
        runs: database.prediction.runs,
        latestRunAt: database.prediction.latestRunAt,
        model: database.prediction.model,
        stage: database.prediction.stage,
      },
      requests: this.metrics.snapshot(),
      apiSurface: this.apiSurface,
      baseUrl: `${origin}/api`,
      docsUrl: `${origin}/docs`,
      openApiUrl: `${origin}/docs-json`,
      healthUrl: `${origin}/api/health/json`,
      webUrl: (process.env.PUBLIC_WEB_URL ?? 'https://criczapp.com').replace(/\/$/, ''),
      config: {
        rateLimit: `${this.config.get('RATE_LIMIT_MAX', 100)} req / ${Math.round(
          Number(this.config.get('RATE_LIMIT_TTL', 60)),
        )}s`,
        email: this.config.get('EMAIL_PROVIDER') ?? 'not configured',
        media: this.config.get('CLOUDINARY_CLOUD_NAME') ? 'Cloudinary' : 'not configured',
        push: this.config.get('FIREBASE_PROJECT_ID') ? 'FCM' : 'not configured',
        realtime: 'Socket.IO + SSE',
      },
    };
  }

  private async collectDatabase() {
    const started = Date.now();
    const emptyPrediction = {
      runs: 0,
      latestRunAt: null as string | null,
      model: null as string | null,
      stage: null as string | null,
    };

    try {
      const [
        versionRows,
        matches,
        liveMatches,
        completedMatches,
        upcomingMatches,
        teams,
        players,
        tournaments,
        publishedArticles,
        users,
        predictions,
        gallery,
        latestMatch,
        latestPrediction,
      ] = await withTimeout(
        Promise.all([
          this.prisma.$queryRaw<{ version: string }[]>`SELECT version() AS version`,
          this.prisma.match.count(),
          this.prisma.match.count({ where: { status: 'live' } }),
          this.prisma.match.count({ where: { status: 'completed' } }),
          this.prisma.match.count({ where: { status: 'upcoming' } }),
          this.prisma.team.count(),
          this.prisma.player.count(),
          this.prisma.tournament.count(),
          this.prisma.newsArticle.count({ where: { isPublished: true } }),
          this.prisma.user.count(),
          this.prisma.predictionRun.count(),
          this.prisma.galleryMedia.count(),
          this.prisma.match.findFirst({
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
          }),
          this.prisma.predictionRun.findFirst({
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true, modelVersion: true, stage: true },
          }),
        ]),
        DB_TIMEOUT_MS,
        'Database',
      );

      const latencyMs = Date.now() - started;

      return {
        ok: true as const,
        latencyMs,
        version: postgresVersion(versionRows[0]?.version),
        latestMatchAt: latestMatch?.updatedAt?.toISOString() ?? null,
        counts: {
          matches,
          liveMatches,
          completedMatches,
          upcomingMatches,
          teams,
          players,
          tournaments,
          publishedArticles,
          users,
          predictions,
          gallery,
        },
        prediction: {
          runs: predictions,
          latestRunAt: latestPrediction?.createdAt?.toISOString() ?? null,
          model: latestPrediction?.modelVersion ?? null,
          stage: latestPrediction?.stage ?? null,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Landing page database probe failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        ok: false as const,
        latencyMs: Date.now() - started,
        version: null,
        latestMatchAt: null,
        counts: null,
        prediction: emptyPrediction,
      };
    }
  }

  private async collectRedis() {
    const started = Date.now();

    try {
      const [pong, heartbeatRaw, liveIds, newsSyncRaw, syncKeys, info] = await withTimeout(
        Promise.all([
          this.redis.cached.ping(),
          this.redis.cached.get('ingestion:heartbeat'),
          this.redis.cached.smembers('matches:live'),
          this.redis.cached.get('ref:sync:news'),
          this.redis.cached.keys('ref:sync:*'),
          this.redis.cached.info('server'),
        ]),
        REDIS_TIMEOUT_MS,
        'Redis',
      );

      if (pong !== 'PONG') throw new Error(`Unexpected PING reply: ${pong}`);
      const latencyMs = Date.now() - started;
      const newsSynced = Number(newsSyncRaw);

      return {
        ok: true as const,
        latencyMs,
        version: redisVersion(info),
        liveSetSize: liveIds.length,
        syncKeyCount: syncKeys.length,
        newsSyncedAt:
          Number.isFinite(newsSynced) && newsSynced > 0
            ? new Date(newsSynced).toISOString()
            : null,
        heartbeat: parseHeartbeat(heartbeatRaw),
      };
    } catch (error) {
      this.logger.warn(
        `Landing page Redis probe failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        ok: false as const,
        latencyMs: Date.now() - started,
        version: null,
        liveSetSize: 0,
        syncKeyCount: 0,
        newsSyncedAt: null,
        heartbeat: { ts: null, liveCount: null, error: null },
      };
    }
  }

  private ingestionCard(
    heartbeat: { ts: number | null; liveCount: number | null; error: string | null },
    now: number,
  ) {
    const heartbeatAgeMs = heartbeat.ts ? Math.max(0, now - heartbeat.ts) : null;
    const status: ServiceStatus =
      heartbeatAgeMs === null
        ? 'unknown'
        : heartbeatAgeMs < 120_000
          ? 'operational'
          : 'degraded';

    return {
      status,
      heartbeatAgeMs,
      liveCount: heartbeat.liveCount,
      lastError: heartbeat.error,
    };
  }

  private predictionCard(prediction: {
    runs: number;
    latestRunAt: string | null;
    model: string | null;
    stage: string | null;
  }) {
    const latest = prediction.latestRunAt ? new Date(prediction.latestRunAt).getTime() : null;
    const ageMs = latest ? Math.max(0, Date.now() - latest) : null;

    const status: ServiceStatus =
      latest === null
        ? 'idle'
        : ageMs !== null && ageMs < 30 * 60_000
          ? 'operational'
          : ageMs !== null && ageMs < 24 * 60 * 60_000
            ? 'idle'
            : 'degraded';

    return {
      status,
      detail:
        latest === null
          ? 'No prediction runs stored yet'
          : `Latest run ${this.secondsAgo(ageMs)}${prediction.stage ? ` · ${prediction.stage}` : ''}`,
      meta:
        prediction.model != null
          ? `${prediction.model} · ${prediction.runs.toLocaleString('en-US')} runs`
          : 'Append-only run history',
    };
  }

  private secondsAgo(ms: number | null): string {
    if (ms === null) return 'never';
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }
}
