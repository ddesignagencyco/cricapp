import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('PslModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    // Seed teams referenced by standings
    await ctx.prisma.team.create({
      data: { id: 'sr:team:1', name: 'Lahore Qalandars', abbr: 'LQ', country: 'Pakistan' },
    });
    await ctx.prisma.team.create({
      data: { id: 'sr:team:2', name: 'Karachi Kings', abbr: 'KK', country: 'Pakistan' },
    });

    // Seed standings for default season (2026)
    await ctx.prisma.pslStanding.create({
      data: {
        seasonId: 'sr:season:140552',
        teamId: 'sr:team:1',
        teamName: 'Lahore Qalandars',
        teamAbbr: 'LQ',
        rank: 1,
        played: 10,
        won: 7,
        points: 14,
      },
    });
    await ctx.prisma.pslStanding.create({
      data: {
        seasonId: 'sr:season:140552',
        teamId: 'sr:team:2',
        teamName: 'Karachi Kings',
        teamAbbr: 'KK',
        rank: 2,
        played: 10,
        won: 6,
        points: 12,
      },
    });

    // Seed fixture
    await ctx.prisma.pslFixture.create({
      data: {
        matchId: 'sr:match:psl1',
        seasonId: 'sr:season:140552',
        status: 'not_started',
        scheduled: '2026-03-01T14:00:00Z',
        homeTeamId: 'sr:team:1',
        homeTeamName: 'Lahore Qalandars',
        homeTeamAbbr: 'LQ',
        awayTeamId: 'sr:team:2',
        awayTeamName: 'Karachi Kings',
        awayTeamAbbr: 'KK',
        venue: 'Gaddafi Stadium',
      },
    });

    // Seed leaders
    await ctx.prisma.pslLeader.create({
      data: {
        seasonId: 'sr:season:140552',
        category: 'batting',
        stat: 'runs',
        rank: 1,
        playerId: 'sr:player:1',
        playerName: 'Babar Azam',
        teamAbbr: 'KK',
        teamName: 'Karachi Kings',
        value: 450,
      },
    });
    await ctx.prisma.pslLeader.create({
      data: {
        seasonId: 'sr:season:140552',
        category: 'batting',
        stat: 'runs',
        rank: 2,
        playerId: 'sr:player:2',
        playerName: 'Fakhar Zaman',
        teamAbbr: 'LQ',
        teamName: 'Lahore Qalandars',
        value: 420,
      },
    });

    // Seed players for squads
    await ctx.prisma.player.create({
      data: { id: 'sr:player:10', fullName: 'Shaheen Afridi', teamId: 'sr:team:1', role: 'bowler', nationality: 'Pakistan' },
    });
    await ctx.prisma.player.create({
      data: { id: 'sr:player:11', fullName: 'Shoaib Malik', teamId: 'sr:team:2', role: 'all_rounder', nationality: 'Pakistan' },
    });
  });

  it('GET /psl/seasons — returns available seasons', async () => {
    const res = await ctx.agent.get('/psl/seasons').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('year');
  });

  it('GET /psl/standings — returns paginated standings for default season', async () => {
    const res = await ctx.agent.get('/psl/standings').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].teamAbbr).toBe('LQ');
    expect(res.body.meta.totalRecords).toBe(2);
  });

  it('GET /psl/standings?season=2025 — returns empty when no data for season', async () => {
    const res = await ctx.agent.get('/psl/standings?season=2025').expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.totalRecords).toBe(0);
  });

  it('GET /psl/schedule — returns fixtures', async () => {
    const res = await ctx.agent.get('/psl/schedule').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].matchId).toBe('sr:match:psl1');
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('GET /psl/leaders — returns leader groups', async () => {
    const res = await ctx.agent.get('/psl/leaders').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('batting');
    expect(res.body.data[0].stat).toBe('runs');
    expect(res.body.data[0].entries).toHaveLength(2);
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('GET /psl/squads — returns team squads with players', async () => {
    const res = await ctx.agent.get('/psl/squads').expect(200);
    expect(res.body.data).toHaveLength(2);
    const lq = res.body.data.find((s: any) => s.teamAbbr === 'LQ');
    expect(lq).toBeDefined();
    expect(lq.players).toHaveLength(1);
    expect(lq.players[0].playerName).toBe('Shaheen Afridi');
    expect(res.body.meta.totalRecords).toBe(2);
  });
});
