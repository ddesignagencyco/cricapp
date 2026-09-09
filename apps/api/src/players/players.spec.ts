import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('PlayersModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    // Seed team and players
    await ctx.prisma.team.create({
      data: {
        id: 'sr:team:1',
        name: 'England',
        abbr: 'ENG',
        country: 'England',
      },
    });
    await ctx.prisma.player.create({
      data: {
        id: 'sr:player:1',
        fullName: 'Joe Root',
        shortName: 'J Root',
        teamId: 'sr:team:1',
        nationality: 'England',
        role: 'batsman',
        battingStyle: 'Right-hand bat',
      },
    });
    await ctx.prisma.player.create({
      data: {
        id: 'sr:player:2',
        fullName: 'Steve Smith',
        shortName: 'S Smith',
        nationality: 'Australia',
        role: 'batsman',
      },
    });
  });

  it('GET /players — returns paginated players', async () => {
    const res = await ctx.agent.get('/players').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.totalRecords).toBe(2);
  });

  it('GET /players?q=Joe — filters by name substring', async () => {
    const res = await ctx.agent.get('/players?q=Joe').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].fullName).toBe('Joe Root');
  });

  it('GET /players?team=ENG — filters by team abbreviation', async () => {
    const res = await ctx.agent.get('/players?team=ENG').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].fullName).toBe('Joe Root');
  });

  it('GET /players/:playerId — returns profile', async () => {
    await ctx.prisma.playerProfile.create({
      data: {
        playerId: 'sr:player:1',
        payload: { stats: { runs: 10000 } },
      },
    });

    const res = await ctx.agent.get('/players/sr:player:1').expect(200);
    expect(res.body.id).toBe('sr:player:1');
    expect(res.body.fullName).toBe('Joe Root');
    expect(res.body.team.abbr).toBe('ENG');
    expect(res.body.providerProfile).toEqual({ stats: { runs: 10000 } });
  });

  it('GET /players/:playerId — returns 404 for unknown player', async () => {
    await ctx.agent.get('/players/unknown').expect(404);
  });

  it('GET /players/:playerId?recent=2 — includes recent matches', async () => {
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:301',
        status: 'closed',
        teams: ['ENG', 'AUS'],
        teamNames: ['England', 'Australia'],
        tournament: 'Ashes',
        venue: 'Lord\'s',
        scheduled: '2026-08-15T10:00:00Z',
        displayScore: '300/5',
        lastEvent: { type: 'wicket' },
      },
    });
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:302',
        status: 'closed',
        teams: ['ENG', 'AUS'],
        teamNames: ['England', 'Australia'],
        tournament: 'Ashes',
        venue: 'Oval',
        scheduled: '2026-08-20T10:00:00Z',
        displayScore: '250/8',
        lastEvent: { type: 'runs', runs: 4 },
      },
    });

    const res = await ctx.agent.get('/players/sr:player:1?recent=2').expect(200);
    expect(res.body.recentMatches).toHaveLength(2);
    expect(res.body.recentMatches[0].matchId).toBe('sr:match:302');
  });
});
