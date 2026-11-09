import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

const A = { id: 'cb:team:1', name: 'Alpha Kings', abbreviation: 'ALK' };
const B = { id: 'cb:team:2', name: 'Beta Lions', abbreviation: 'BEL' };
const C = { id: 'cb:team:3', name: 'Gamma Stars', abbreviation: 'GAS' };

const future = new Date(Date.now() + 10 * 86400000).toISOString();

/** A finished game, stored the way results are: `{ sport_event, sport_event_status }`. */
const result = (id: string, scheduled: string, home: typeof A, away: typeof A, text: string) => ({
  kind: 'team_results',
  scopeKey: home.id,
  eventId: id,
  status: 'closed',
  scheduled,
  payload: {
    sport_event: {
      id,
      scheduled,
      status: 'closed',
      tournament: { name: 'Test Cup' },
      competitors: [{ ...home, qualifier: 'home' }, { ...away, qualifier: 'away' }],
    },
    sport_event_status: { status: 'closed', match_result_text: text },
  },
});

describe('HeadToHeadModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });
  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
    await ctx.prisma.sportEventRecord.createMany({
      data: [
        result('cb:match:1', '2026-01-01T10:00:00Z', A, B, 'Alpha Kings won by 10 runs'),
        result('cb:match:2', '2026-02-01T10:00:00Z', B, A, 'Beta Lions won by 3 wkts'),
        result('cb:match:3', '2026-03-01T10:00:00Z', A, B, 'Match abandoned due to rain'),
        result('cb:match:4', '2026-03-05T10:00:00Z', A, C, 'Alpha Kings won by 5 runs'), // another pair
        {
          // a fixture not yet played: a bare event, as schedules are stored
          kind: 'team_schedule',
          scopeKey: A.id,
          eventId: 'cb:match:5',
          status: 'not_started',
          scheduled: future,
          payload: { id: 'cb:match:5', scheduled: future, status: 'not_started', competitors: [A, B] },
        },
        {
          // the same finished game also appears in a schedule with no result text: the result wins
          kind: 'daily_schedule',
          scopeKey: '2026-01-01',
          eventId: 'cb:match:1',
          status: 'closed',
          scheduled: '2026-01-01T10:00:00Z',
          payload: { id: 'cb:match:1', status: 'closed', scheduled: '2026-01-01T10:00:00Z', competitors: [A, B] },
        },
      ],
    });
  });

  it('rebuilds past meetings with winners read from the result text, and upcoming ones', async () => {
    const res = await ctx.agent.get('/head-to-head/cb:team:1/cb:team:2').expect(200);
    const last = res.body.payload.last_meetings;
    expect(last.map((m: any) => m.sport_event.id)).toEqual(['cb:match:3', 'cb:match:2', 'cb:match:1']); // newest first
    expect(last.find((m: any) => m.sport_event.id === 'cb:match:1').sport_event_status).toMatchObject({
      match_result_text: 'Alpha Kings won by 10 runs',
      winner_id: 'cb:team:1',
    });
    expect(last.find((m: any) => m.sport_event.id === 'cb:match:2').sport_event_status.winner_id).toBe('cb:team:2');
    expect(last.find((m: any) => m.sport_event.id === 'cb:match:3').sport_event_status.winner_id).toBeUndefined();
    expect(res.body.payload.next_meetings.map((e: any) => e.id)).toEqual(['cb:match:5']);
    expect(res.body.payload.competitors.map((c: any) => c.id).sort()).toEqual(['cb:team:1', 'cb:team:2']);
  });

  it('does not depend on the order the teams are asked in', async () => {
    const res = await ctx.agent.get('/head-to-head/cb:team:2/cb:team:1').expect(200);
    expect(res.body.payload.last_meetings).toHaveLength(3);
  });

  it('keeps other pairings out', async () => {
    const res = await ctx.agent.get('/head-to-head/cb:team:1/cb:team:3').expect(200);
    expect(res.body.payload.last_meetings.map((m: any) => m.sport_event.id)).toEqual(['cb:match:4']);
  });

  it('is a 404 for teams that never met in the stored data', async () => {
    await ctx.agent.get('/head-to-head/cb:team:2/cb:team:3').expect(404);
  });
});
