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

/**
 * The list order and the tournament filter.
 *
 * Separate from the block above because it needs its own rows: `beforeEach` there seeds a
 * single live match, which is not enough to tell one ordering rule from another.
 */
describe('GET /matches — ordering', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    // Dates are relative to now, and written in the exact shape ingestion writes
    // (`YYYY-MM-DDTHH:MM:SS+00:00`). Hardcoded dates would quietly start failing the day
    // they fell into the past, and a fixture in the wrong format would prove nothing about
    // the ordering of real rows.
    const at = (days: number) =>
      new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19) + '+00:00';
    const seed = [
      // status,      scheduled,  id
      ['completed', at(-900), 'old'],
      ['completed', at(-2), 'recent'],
      ['completed', at(-200), 'middle'],
      ['upcoming', at(30), 'far'],
      ['upcoming', at(2), 'near'],
      ['live', at(-1), 'inplay'],
    ] as const;
    for (const [status, scheduled, id] of seed) {
      await ctx.prisma.match.create({
        data: {
          matchId: `sr:match:${id}`,
          status,
          teams: ['a', 'b'],
          teamNames: ['Team A', 'Team B'],
          tournament: 'Series',
          scheduled,
          lastEvent: { type: 'none', runs: 0, over: 0 },
        },
      });
    }
  });

  const ids = (body: { data: Array<{ matchId: string }> }) =>
    body.data.map((m) => m.matchId.replace('sr:match:', ''));

  it('puts a live match first, then the soonest fixture, then results newest first', async () => {
    // `scheduled ASC` on its own opened this page on `old`, a result from six years ago,
    // because every finished match sorted before anything yet to be played.
    const res = await ctx.agent.get('/matches').expect(200);
    expect(ids(res.body)).toEqual(['inplay', 'near', 'far', 'recent', 'middle', 'old']);
  });

  it('still returns every row and counts them', async () => {
    const res = await ctx.agent.get('/matches').expect(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.meta.totalRecords).toBe(6);
  });

  it('never repeats or skips a row across pages', async () => {
    // Without a total tiebreak two rows can share a status and a start time, and an
    // unstable order makes LIMIT/OFFSET paging drop one and show another twice.
    const p1 = await ctx.agent.get('/matches?limit=2&page=1').expect(200);
    const p2 = await ctx.agent.get('/matches?limit=2&page=2').expect(200);
    const p3 = await ctx.agent.get('/matches?limit=2&page=3').expect(200);
    const seen = [...ids(p1.body), ...ids(p2.body), ...ids(p3.body)];
    expect(seen).toEqual(['inplay', 'near', 'far', 'recent', 'middle', 'old']);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('applies the same order to a search', async () => {
    const res = await ctx.agent.get('/matches?q=Series').expect(200);
    expect(ids(res.body)).toEqual(['inplay', 'near', 'far', 'recent', 'middle', 'old']);
  });

  it('returns fully populated summaries, not rows of undefined', async () => {
    // A raw `SELECT *` comes back with `match_id`, not `matchId`. Reading `matchId` off
    // that row yields undefined, and the page renders with no teams, no score and no id —
    // a silent blank rather than an error.
    const res = await ctx.agent.get('/matches').expect(200);
    for (const row of res.body.data) {
      expect(row.matchId).toBeTruthy();
      expect(row.status).toBeTruthy();
      expect(Array.isArray(row.teams)).toBe(true);
      expect(row.teamNames).toEqual(['Team A', 'Team B']);
    }
  });
});

describe('GET /matches — fixtures whose start time has already passed', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    const now = new Date();
    const at = (days: number) =>
      new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19) + '+00:00';
    const seed = [
      // A fixture from last month that ingestion never re-checked.
      ['upcoming', at(-30), 'overdue'],
      // A fixture from last week, same story.
      ['upcoming', at(-7), 'overdue2'],
      // The genuine fixtures.
      ['upcoming', at(2), 'soon'],
      ['upcoming', at(9), 'later'],
    ] as const;
    for (const [status, scheduled, id] of seed) {
      await ctx.prisma.match.create({
        data: {
          matchId: `sr:match:${id}`,
          status,
          teams: ['a', 'b'],
          teamNames: ['Team A', 'Team B'],
          tournament: 'Series',
          scheduled,
          lastEvent: { type: 'none', runs: 0, over: 0 },
        },
      });
    }
  });

  const ids = (body: { data: Array<{ matchId: string }> }) =>
    body.data.map((m) => m.matchId.replace('sr:match:', ''));

  it('puts fixtures a reader can still attend above ones already overdue', async () => {
    // Sorted purely by date, the two-month-old row sorted first and the Upcoming tab
    // opened on a match from August while the next real fixture sat below it. Within the
    // overdue remainder the oldest comes first, which is arbitrary but harmless — the only
    // thing that matters is that the whole remainder sits below the real fixtures.
    const res = await ctx.agent.get('/matches?status=upcoming').expect(200);
    expect(ids(res.body)).toEqual(['soon', 'later', 'overdue', 'overdue2']);
  });

  it('leaves an in-play match above the fixtures whatever its start time', async () => {
    // A live match's start time is always in the past, so treating "overdue" as a general
    // demotion would push every in-play match below the future fixtures — inverting the
    // one rule that matters most.
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:inplay',
        status: 'live',
        teams: ['a', 'b'],
        teamNames: ['Team A', 'Team B'],
        tournament: 'Series',
        scheduled: '2020-01-01T00:00:00+00:00',
        lastEvent: { type: 'none', runs: 0, over: 0 },
      },
    });
    const res = await ctx.agent.get('/matches').expect(200);
    expect(ids(res.body)[0]).toBe('inplay');
  });

  it('still lists the overdue fixtures, rather than hiding them', async () => {
    // The status on the row is the ingestion service's to correct. Sorting them lower is
    // not a licence to drop them, and the count must not quietly shrink either.
    const res = await ctx.agent.get('/matches?status=upcoming').expect(200);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.meta.totalRecords).toBe(4);
  });
});

describe('GET /matches — tournamentId filter', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    const seed = [
      ['sr:tournament:1', 'Global T20 Canada', 'a'],
      ['sr:tournament:2', 'Global T20 Canada 2024', 'b'],
      ['sr:tournament:2', 'Global T20 Canada 2024', 'c'],
    ] as const;
    for (const [tournamentId, tournament, id] of seed) {
      await ctx.prisma.match.create({
        data: {
          matchId: `sr:match:${id}`,
          status: 'upcoming',
          teams: ['x', 'y'],
          teamNames: ['Team X', 'Team Y'],
          tournament,
          tournamentId,
          scheduled: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 19) + '+00:00',
          lastEvent: { type: 'none', runs: 0, over: 0 },
        },
      });
    }
  });

  it('matches one competition exactly', async () => {
    const res = await ctx.agent
      .get('/matches?tournamentId=sr:tournament:1')
      .expect(200);
    expect(res.body.data.map((m: { matchId: string }) => m.matchId)).toEqual(['sr:match:a']);
    expect(res.body.meta.totalRecords).toBe(1);
  });

  it('returns every fixture of the requested competition', async () => {
    const res = await ctx.agent
      .get('/matches?tournamentId=sr:tournament:2')
      .expect(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('is not fooled by a name that is a prefix of another', async () => {
    // The name filter is a substring match, so asking for "Global T20 Canada" also
    // returns "Global T20 Canada 2024". The id filter cannot do that.
    const byName = await ctx.agent.get('/matches?tournament=Global T20 Canada').expect(200);
    expect(byName.body.data).toHaveLength(3);
    const byId = await ctx.agent.get('/matches?tournamentId=sr:tournament:1').expect(200);
    expect(byId.body.data).toHaveLength(1);
  });

  it('returns an empty page rather than everything for an unknown id', async () => {
    const res = await ctx.agent
      .get('/matches?tournamentId=sr:tournament:nope')
      .expect(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.totalRecords).toBe(0);
  });

  it('treats a quote in the value as text, not as SQL', async () => {
    // The value is bound as a parameter, so it cannot close the string and start a new
    // statement. The table is still there and still has its three rows.
    const res = await ctx.agent
      .get(`/matches?tournamentId=${encodeURIComponent("'; DROP TABLE matches; --")}`)
      .expect(200);
    expect(res.body.data).toEqual([]);
    expect(await ctx.prisma.match.count()).toBe(3);
  });

  it('combines with the status filter and keeps the order', async () => {
    const res = await ctx.agent
      .get('/matches?tournamentId=sr:tournament:2&status=upcoming')
      .expect(200);
    expect(res.body.data).toHaveLength(2);
  });
});
