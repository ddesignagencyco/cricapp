import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PREDICTION_MODELS, PREDICTION_STAGE } from '@cricapp/shared-types';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

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
            explanation: { z: 0.4 },
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
    expect(res.body.modelVersion).toBe(PREDICTION_MODELS.PREMATCH);
  });
});
