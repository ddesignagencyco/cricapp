import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PREDICTION_MODELS, PREDICTION_STAGE } from '@cricapp/shared-types';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('OddsModule (integration)', () => {
  let ctx: TestContext;
  const matchId = 'sr:match:odds-1';

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
        matchId,
        status: 'upcoming',
        teams: ['sr:competitor:1', 'sr:competitor:2'],
        teamNames: ['Lahore Qalandars', 'Karachi Kings'],
        tournament: 'PSL',
        scheduled: '2026-09-12T14:00:00Z',
        lastEvent: { type: 'none', runs: 0, over: 0 },
      },
    });

    const sourceA = await ctx.prisma.oddsSource.create({
      data: {
        slug: 'demo-a',
        name: 'Demo A',
        licenseStatus: 'licensed',
        isActive: true,
      },
    });
    const sourceB = await ctx.prisma.oddsSource.create({
      data: {
        slug: 'demo-b',
        name: 'Demo B',
        licenseStatus: 'licensed',
        isActive: true,
      },
    });

    const marketA = await ctx.prisma.oddsMarket.create({
      data: {
        matchId,
        sourceId: sourceA.id,
        marketType: 'match_winner',
        marketKey: 'match_winner',
        name: 'Match winner (incl. super over)',
      },
    });
    const marketB = await ctx.prisma.oddsMarket.create({
      data: {
        matchId,
        sourceId: sourceB.id,
        marketType: 'match_winner',
        marketKey: 'match_winner',
        name: 'Match winner (incl. super over)',
      },
    });

    const open = new Date('2026-09-10T10:00:00Z');
    const now = new Date('2026-09-10T12:00:00Z');

    await ctx.prisma.oddsSnapshot.createMany({
      data: [
        {
          marketId: marketA.id,
          selectionKey: 'home',
          decimalPrice: 1.8,
          capturedAt: open,
        },
        {
          marketId: marketA.id,
          selectionKey: 'away',
          decimalPrice: 2.0,
          capturedAt: open,
        },
        {
          marketId: marketA.id,
          selectionKey: 'home',
          decimalPrice: 1.95,
          capturedAt: now,
        },
        {
          marketId: marketA.id,
          selectionKey: 'away',
          decimalPrice: 1.92,
          capturedAt: now,
        },
        {
          marketId: marketB.id,
          selectionKey: 'home',
          decimalPrice: 1.88,
          capturedAt: now,
        },
        {
          marketId: marketB.id,
          selectionKey: 'away',
          decimalPrice: 2.05,
          capturedAt: now,
        },
      ],
    });

    await ctx.prisma.predictionRun.create({
      data: {
        matchId,
        stage: PREDICTION_STAGE.PRE_MATCH,
        modelVersion: PREDICTION_MODELS.PREMATCH,
        result: {
          create: {
            homeWinProb: 0.58,
            awayWinProb: 0.42,
            confidence: 0.6,
            calibrationBand: 'medium',
            explanation: {},
          },
        },
      },
    });
  });

  it('GET /odds/:matchId — compares sources and marks best home price', async () => {
    const res = await ctx.agent.get(`/odds/${matchId}`).expect(200);
    expect(res.body.matchId).toBe(matchId);
    expect(res.body.compliance.publicEnabled).toBe(true);
    expect(res.body.markets).toHaveLength(1);
    const homeRows = res.body.markets[0].selections.filter(
      (s: { selectionKey: string }) => s.selectionKey === 'home',
    );
    const best = homeRows.find((s: { isBestDisplayedPrice: boolean }) => s.isBestDisplayedPrice);
    expect(best.sourceSlug).toBe('demo-a');
    expect(best.current.decimal).toBe(1.95);
    expect(res.body.modelVsMarket.homeWinProb).toBe(0.58);
  });

  it('GET /odds/:matchId/history — returns chart points', async () => {
    const res = await ctx.agent
      .get(`/odds/${matchId}/history`)
      .query({ selectionKey: 'home' })
      .expect(200);
    expect(res.body.points.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /odds/tools/convert — converts fractional odds', async () => {
    const res = await ctx.agent
      .get('/odds/tools/convert')
      .query({ from: 'fractional', value: '5/2' })
      .expect(200);
    expect(res.body.decimal).toBe(3.5);
  });
});
