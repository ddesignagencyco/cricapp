import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PREDICTION_MODELS, PREDICTION_STAGE } from '@cricapp/shared-types';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';
import { PredictionsService } from './predictions.service.js';
import { JwtService } from '@nestjs/jwt';

describe('PredictionsModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:pred-1',
        status: 'upcoming',
        teams: ['sr:competitor:1', 'sr:competitor:2'],
        teamNames: ['Lahore Qalandars', 'Karachi Kings'],
        tournament: 'Pakistan Super League',
        venue: 'Gaddafi Stadium',
        scheduled: '2026-09-12T14:00:00Z',
        lastEvent: { type: 'none', runs: 0, over: 0 },
      },
    });
    const run = await ctx.prisma.predictionRun.create({
      data: {
        matchId: 'sr:match:pred-1',
        stage: PREDICTION_STAGE.PRE_MATCH,
        modelVersion: PREDICTION_MODELS.PREMATCH,
        features: { create: { snapshot: { homeTeamId: 'sr:competitor:1', awayTeamId: 'sr:competitor:2' } } },
        result: {
          create: {
            homeWinProb: 0.62,
            awayWinProb: 0.38,
            confidence: 0.7,
            calibrationBand: 'medium',
            explanation: { z: 0.4 },
            scoreRange: { low: 145, expected: 160, high: 175 },
            topBatters: [{ playerId: 'p1', probability: 0.4 }],
            topBowlers: [{ playerId: 'p2', probability: 0.4 }],
            xi: { home: [], away: [] },
          },
        },
      },
    });
    expect(run.id).toBeTruthy();
  });

  it('GET /predictions/:matchId — returns latest pre-match run', async () => {
    const res = await ctx.agent.get('/predictions/sr:match:pred-1').expect(200);
    expect(res.body.matchId).toBe('sr:match:pred-1');
    expect(res.body.preMatch.homeWinProb).toBe(0.62);
    expect(res.body.preMatch.narrativeSource).toBe('template');
    expect(res.body.preMatch.narrative).toContain('62%');
    expect(res.body.preMatch.scoreRange.expected).toBe(160);
    expect(res.body.preMatch.calibrationBand).toBe('medium');
    expect(res.body.live).toBeNull();
  });

  it('GET /predictions/:matchId — returns 404 when no runs exist', async () => {
    await ctx.agent.get('/predictions/sr:match:missing').expect(404);
  });

  it('GET /predictions/:matchId/history — returns chronological runs', async () => {
    await ctx.prisma.predictionRun.create({
      data: {
        matchId: 'sr:match:pred-1',
        stage: PREDICTION_STAGE.LIVE,
        modelVersion: PREDICTION_MODELS.LIVE,
        result: {
          create: {
            homeWinProb: 0.55,
            awayWinProb: 0.45,
            confidence: 0.55,
            explanation: { reasons: ['wicket'], over: 12 },
          },
        },
      },
    });
    const res = await ctx.agent.get('/predictions/sr:match:pred-1/history').expect(200);
    expect(res.body.runs).toHaveLength(2);
    expect(res.body.runs[0].stage).toBe('pre_match');
    expect(res.body.runs[1].stage).toBe('live');
  });

  it('GET /predictions/:matchId/chart — returns chart-ready probability points', async () => {
    const res = await ctx.agent.get('/predictions/sr:match:pred-1/chart').expect(200);
    expect(res.body.points).toHaveLength(1);
    expect(res.body.points[0].homeWinProb).toBe(0.62);
  });

  it('GET /predictions/performance — scores settled matches against the latest pre-match run', async () => {
    await ctx.prisma.match.update({
      where: { matchId: 'sr:match:pred-1' },
      data: { status: 'completed' },
    });
    await ctx.prisma.sportEventRecord.create({
      data: {
        kind: 'daily_results',
        scopeKey: '2026-09-12',
        eventId: 'sr:match:pred-1',
        status: 'closed',
        payload: { sport_event_status: { winner_id: 'sr:competitor:1' } },
      },
    });
    const res = await ctx.agent.get('/predictions/performance').expect(200);
    expect(res.body.sampleSize).toBe(1);
    expect(res.body.accuracy).toBe(1);
    expect(res.body.claimReady).toBe(false);
    expect(res.body.guidance).toContain('Do not market');
    expect(res.body.modelVersion).toBe(PREDICTION_MODELS.PREMATCH);
    expect(res.body.stage).toBe('pre_match');
    expect(res.body.expectedCalibrationError).toBeDefined();
    expect(res.body.byConfidenceBand).toEqual([
      expect.objectContaining({ band: 'medium', sampleSize: 1, accuracy: 1 }),
    ]);
  });

  it('GET /predictions/performance?stage=live — evaluates the latest non-decided live run', async () => {
    await ctx.prisma.predictionRun.create({
      data: {
        matchId: 'sr:match:pred-1',
        stage: PREDICTION_STAGE.LIVE,
        modelVersion: PREDICTION_MODELS.LIVE,
        features: {
          create: {
            snapshot: { homeTeamId: 'sr:competitor:1', awayTeamId: 'sr:competitor:2', format: 't20' },
          },
        },
        result: {
          create: {
            homeWinProb: 0.8,
            awayWinProb: 0.2,
            confidence: 0.8,
            explanation: { reasons: ['score'], over: 14 },
          },
        },
      },
    });
    await ctx.prisma.predictionRun.create({
      data: {
        matchId: 'sr:match:pred-1',
        stage: PREDICTION_STAGE.LIVE,
        modelVersion: PREDICTION_MODELS.LIVE,
        features: {
          create: {
            snapshot: { homeTeamId: 'sr:competitor:1', awayTeamId: 'sr:competitor:2', format: 't20' },
          },
        },
        result: {
          create: {
            homeWinProb: 0.15,
            awayWinProb: 0.85,
            confidence: 0.95,
            explanation: { reasons: ['match_decided'], over: 20 },
          },
        },
      },
    });
    await ctx.prisma.match.update({
      where: { matchId: 'sr:match:pred-1' },
      data: { status: 'completed' },
    });
    await ctx.prisma.sportEventRecord.create({
      data: {
        kind: 'daily_results',
        scopeKey: '2026-09-12',
        eventId: 'sr:match:pred-1',
        status: 'closed',
        payload: { sport_event_status: { winner_id: 'sr:competitor:2' } },
      },
    });
    const res = await ctx.agent.get('/predictions/performance?stage=live').expect(200);
    expect(res.body.stage).toBe('live');
    expect(res.body.modelVersion).toBe(PREDICTION_MODELS.LIVE);
    expect(res.body.sampleSize).toBe(1);
    expect(res.body.accuracy).toBe(0);
  });

  it('POST /admin/predictions/performance/snapshot records history readable via GET /predictions/performance/history', async () => {
    await ctx.prisma.match.update({
      where: { matchId: 'sr:match:pred-1' },
      data: { status: 'completed' },
    });
    await ctx.prisma.sportEventRecord.create({
      data: {
        kind: 'daily_results',
        scopeKey: '2026-09-12',
        eventId: 'sr:match:pred-1',
        status: 'closed',
        payload: { sport_event_status: { winner_id: 'sr:competitor:1' } },
      },
    });

    let token = ctx.app.get(JwtService).sign({
      sub: 'admin-2',
      email: 'admin@example.com',
      username: 'admin',
      isAdmin: true,
    });
    const created = await ctx.agent
      .post('/admin/predictions/performance/snapshot?stage=pre_match')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    expect(created.body.modelVersion).toBe(PREDICTION_MODELS.PREMATCH);
    expect(created.body.sampleSize).toBe(1);
    expect(created.body.accuracy).toBe(1);

    const history = await ctx.agent.get('/predictions/performance/history?stage=pre_match').expect(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0]).toEqual(
      expect.objectContaining({
        modelVersion: PREDICTION_MODELS.PREMATCH,
        stage: 'pre_match',
        accuracy: 1,
        source: 'manual',
      }),
    );

    await ctx.agent.post('/admin/predictions/performance/snapshot').expect(401);

    token = ctx.app.get(JwtService).sign({
      sub: 'user-1',
      email: 'user@example.com',
      username: 'user',
      isAdmin: false,
    });
    await ctx.agent
      .post('/admin/predictions/performance/snapshot')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('admin model/run monitoring is guarded and available through the service', async () => {
    await ctx.agent.get('/admin/predictions/model-versions').expect(401);
    await ctx.agent.get('/admin/predictions/runs').expect(401);

    const token = ctx.app.get(JwtService).sign({
      sub: 'admin-1',
      email: 'admin@example.com',
      username: 'admin',
      isAdmin: true,
    });
    const modelResponse = await ctx.agent
      .get('/admin/predictions/model-versions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(modelResponse.body).toEqual([
      expect.objectContaining({ modelVersion: PREDICTION_MODELS.PREMATCH, runCount: 1 }),
    ]);
    const runsResponse = await ctx.agent
      .get('/admin/predictions/runs?limit=10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(runsResponse.body.meta.totalRecords).toBe(1);
    const runId = runsResponse.body.data[0].runId;
    const detail = await ctx.agent
      .get(`/admin/predictions/runs/${runId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(detail.body.features.homeTeamId).toBe('sr:competitor:1');
    await ctx.prisma.match.update({
      where: { matchId: 'sr:match:pred-1' },
      data: { status: 'completed' },
    });
    await ctx.prisma.sportEventRecord.create({
      data: {
        kind: 'daily_results',
        scopeKey: '2026-09-12',
        eventId: 'sr:match:pred-1',
        status: 'closed',
        payload: { sport_event_status: { winner_id: 'sr:competitor:1' } },
      },
    });
    const calibration = await ctx.agent
      .get('/admin/predictions/calibration?bins=5')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(calibration.body.sampleSize).toBe(1);
    expect(calibration.body.bins).toHaveLength(1);
    expect(calibration.body.bins[0]).toEqual(
      expect.objectContaining({ sampleSize: 1, meanPredicted: 0.62, actualRate: 1 }),
    );

    const service = ctx.app.get(PredictionsService);
    const models = await service.listModelVersions();
    expect(models).toEqual([
      expect.objectContaining({ modelVersion: PREDICTION_MODELS.PREMATCH, runCount: 1 }),
    ]);
    const runs = await service.listRuns({ page: 1, limit: 10 });
    expect(runs.meta.totalRecords).toBe(1);
    expect(runs.data[0]).toEqual(
      expect.objectContaining({ matchId: 'sr:match:pred-1', calibrationBand: 'medium' }),
    );
  });

  it('GET /admin/predictions/model-weights — returns learned weights per model/stage/format', async () => {
    await ctx.prisma.predictionModelWeight.create({
      data: {
        modelVersion: PREDICTION_MODELS.PREMATCH,
        stage: 'pre_match',
        format: 't20',
        weights: {
          form: 1.7,
          h2h: 0.5,
          table: 0.6,
          venue: 0.2,
          toss: 0.1,
          conditions: 0.2,
          squad: 0.4,
        },
        intercept: -0.1,
        sampleSize: 30,
        accuracy: 0.7,
        source: 'auto',
      },
    });

    const token = ctx.app.get(JwtService).sign({
      sub: 'admin-3',
      email: 'admin@example.com',
      username: 'admin',
      isAdmin: true,
    });
    const res = await ctx.agent
      .get('/admin/predictions/model-weights')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        format: 't20',
        stage: 'pre_match',
        sampleSize: 30,
        accuracy: 0.7,
        weights: expect.objectContaining({ form: 1.7 }),
      }),
    );

    await ctx.agent.get('/admin/predictions/model-weights').expect(401);
  });
});
