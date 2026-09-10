import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('SearchModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    await ctx.prisma.team.create({
      data: { id: 'sr:team:1', name: 'Lahore Qalandars', abbr: 'LQ', country: 'Pakistan' },
    });
    await ctx.prisma.player.create({
      data: { id: 'sr:player:1', fullName: 'Babar Azam', teamId: 'sr:team:1', role: 'batsman', nationality: 'Pakistan' },
    });
    await ctx.prisma.tournament.create({
      data: { id: 'sr:tournament:1', name: 'Pakistan Super League' },
    });
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:1',
        status: 'upcoming',
        teams: ['LQ', 'KK'],
        teamNames: ['Lahore Qalandars', 'Karachi Kings'],
        tournament: 'PSL 2026',
        venue: 'Gaddafi Stadium',
        lastEvent: { type: 'none', runs: 0, over: 0 },
      },
    });
  });

  it('GET /search?q= — returns grouped results', async () => {
    const res = await ctx.agent.get('/search?q=lahore').expect(200);
    expect(res.body.teams.length).toBeGreaterThan(0);
    expect(res.body.matches.length).toBeGreaterThan(0);
  });

  it('GET /teams?q= — filters teams by name', async () => {
    const res = await ctx.agent.get('/teams?q=qalandars').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].abbr).toBe('LQ');
  });
});
