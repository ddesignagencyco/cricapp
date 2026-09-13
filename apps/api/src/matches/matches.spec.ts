import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('MatchesModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    // Seed a match
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:999',
        status: 'live',
        teams: ['team-a', 'team-b'],
        teamNames: ['Team A', 'Team B'],
        tournament: 'Test Series',
        venue: 'Test Ground',
        scheduled: '2026-09-01T10:00:00Z',
        currentInnings: { battingTeam: 'team-a', runs: 120, wickets: 2, overs: 15.3, runRate: 7.8 },
        lastEvent: { type: 'runs', runs: 4, over: 15.3 },
        displayScore: '120/2',
        matchStatus: '1st innings',
      },
    });
  });

  it('GET /matches — returns paginated matches', async () => {
    const res = await ctx.agent.get('/matches').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].matchId).toBe('sr:match:999');
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('GET /matches/live — returns live matches', async () => {
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:completed',
        status: 'completed',
        teams: ['team-c', 'team-d'],
        teamNames: ['Team C', 'Team D'],
        lastEvent: { type: 'none', runs: 0, over: 0 },
      },
    });
    const res = await ctx.agent.get('/matches/live').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].matchId).toBe('sr:match:999');
    expect(res.body.data.every((match: { status: string }) => match.status === 'live')).toBe(true);
  });

  it('GET /matches/:id — returns match by id', async () => {
    const res = await ctx.agent.get('/matches/sr:match:999').expect(200);
    expect(res.body.matchId).toBe('sr:match:999');
    expect(res.body.status).toBe('live');
  });

  it('GET /matches/:id — returns 404 for unknown match', async () => {
    await ctx.agent.get('/matches/unknown').expect(404);
  });
});
