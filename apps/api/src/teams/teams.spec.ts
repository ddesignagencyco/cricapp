import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('TeamsModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    // Seed a team
    await ctx.prisma.team.create({
      data: {
        id: 'sr:team:1',
        name: 'England',
        abbr: 'ENG',
        country: 'England',
        logoUrl: 'https://example.com/eng.png',
        manager: 'Coach A',
      },
    });
  });

  it('GET /teams — returns paginated teams', async () => {
    const res = await ctx.agent.get('/teams').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].abbr).toBe('ENG');
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('GET /teams/:idOrAbbr — returns team by id', async () => {
    const res = await ctx.agent.get('/teams/sr:team:1').expect(200);
    expect(res.body.id).toBe('sr:team:1');
    expect(res.body.name).toBe('England');
  });

  it('GET /teams/:idOrAbbr — returns team by abbreviation', async () => {
    const res = await ctx.agent.get('/teams/ENG').expect(200);
    expect(res.body.id).toBe('sr:team:1');
    expect(res.body.abbr).toBe('ENG');
  });

  it('GET /teams/:idOrAbbr — returns 404 for unknown team', async () => {
    await ctx.agent.get('/teams/UNKNOWN').expect(404);
  });

  it('GET /teams/:idOrAbbr/players — returns roster', async () => {
    await ctx.prisma.player.create({
      data: {
        id: 'sr:player:1',
        fullName: 'Joe Root',
        shortName: 'J Root',
        teamId: 'sr:team:1',
        nationality: 'England',
        role: 'batsman',
      },
    });

    const res = await ctx.agent.get('/teams/ENG/players').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].fullName).toBe('Joe Root');
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('GET /teams/:idOrAbbr/schedule — returns upcoming matches', async () => {
    await ctx.prisma.sportEventRecord.create({
      data: {
        kind: 'team_schedule',
        scopeKey: 'sr:team:1',
        eventId: 'sr:match:100',
        status: 'not_started',
        scheduled: '2026-10-01T10:00:00Z',
        payload: { opponent: 'Australia' },
      },
    });

    const res = await ctx.agent.get('/teams/ENG/schedule').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].eventId).toBe('sr:match:100');
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('GET /teams/:idOrAbbr/results — returns completed matches', async () => {
    await ctx.prisma.sportEventRecord.create({
      data: {
        kind: 'team_results',
        scopeKey: 'sr:team:1',
        eventId: 'sr:match:200',
        status: 'closed',
        scheduled: '2026-08-01T10:00:00Z',
        payload: { result: 'won' },
      },
    });

    const res = await ctx.agent.get('/teams/ENG/results').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].eventId).toBe('sr:match:200');
    expect(res.body.meta.totalRecords).toBe(1);
  });
});
