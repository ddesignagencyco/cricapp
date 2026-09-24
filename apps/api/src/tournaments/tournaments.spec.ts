import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('TournamentsModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    await ctx.prisma.tournament.create({
      data: {
        id: 'sr:tournament:2472',
        name: 'Indian Premier League',
        type: 't20',
        gender: 'men',
        category: { id: 'sr:category:497', name: 'India' },
        currentSeason: { id: 'sr:season:131399', name: 'Indian Premier League 2026', year: '2026' },
        sport: { id: 'sr:sport:21', name: 'Cricket' },
        groups: [
          {
            teams: [
              { id: 'sr:competitor:152316', name: 'Sunrisers Hyderabad', abbreviation: 'SRH' },
              { id: 'sr:competitor:152324', name: 'Mumbai Indians', abbreviation: 'MI' },
            ],
          },
        ],
      },
    });
  });

  it('GET /tournaments — returns paginated tournament summaries', async () => {
    const res = await ctx.agent.get('/tournaments').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Indian Premier League');
  });

  it('GET /tournaments/:id — returns the full tournament incl. groups (teams)', async () => {
    const res = await ctx.agent.get('/tournaments/sr:tournament:2472').expect(200);
    expect(res.body.id).toBe('sr:tournament:2472');
    expect(res.body.name).toBe('Indian Premier League');
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.groups[0].teams.map((t: { abbreviation: string }) => t.abbreviation)).toEqual([
      'SRH',
      'MI',
    ]);
  });

  it('GET /tournaments/:id/seasons — lists seasons', async () => {
    await ctx.prisma.tournamentSeason.create({
      data: {
        id: 'sr:season:131399',
        tournamentId: 'sr:tournament:2472',
        name: 'Indian Premier League 2026',
        year: '2026',
        startDate: '2026-03-28',
        endDate: '2026-05-31',
      },
    });
    const res = await ctx.agent.get('/tournaments/sr:tournament:2472/seasons').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe('sr:season:131399');
  });

  it('GET /tournaments/:id — returns 404 for unknown tournament', async () => {
    await ctx.agent.get('/tournaments/sr:tournament:0000').expect(404);
  });
});