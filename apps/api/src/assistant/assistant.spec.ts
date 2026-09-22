import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PREDICTION_MODELS, PREDICTION_STAGE } from '@cricapp/shared-types';
import { setupTestApp, teardownTestApp, cleanDatabase, type TestContext } from '../common/test-setup.js';

describe('AssistantModule (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(ctx);
  });

  beforeEach(async () => {
    await cleanDatabase(ctx.prisma);
  });

  it('POST /assistant/ask — head-to-head from stored payload', async () => {
    await ctx.prisma.team.createMany({
      data: [
        { id: 'sr:competitor:h2h-a', name: 'Team Alpha', abbr: 'TMA', country: 'PK' },
        { id: 'sr:competitor:h2h-b', name: 'Team Beta', abbr: 'TMB', country: 'PK' },
      ],
    });
    const [a, b] = ['sr:competitor:h2h-a', 'sr:competitor:h2h-b'].sort();
    await ctx.prisma.headToHead.create({
      data: {
        teamAId: a,
        teamBId: b,
        payload: {
          competitors: [
            { id: a, name: 'Team Alpha' },
            { id: b, name: 'Team Beta' },
          ],
          last_meetings: [
            {
              sport_event: {
                id: 'sr:match:m1',
                start_time: '2025-01-01T00:00:00Z',
                competitors: [
                  { id: a, qualifier: 'home', winner: true },
                  { id: b, qualifier: 'away' },
                ],
              },
              sport_event_status: { winner_id: a, match_result_text: 'Alpha won by 5 runs' },
            },
          ],
          next_meetings: [],
        },
      },
    });

    const res = await ctx.agent
      .post('/assistant/ask')
      .send({
        question: 'Team Alpha vs Team Beta head to head',
        intent: 'team_head_to_head',
        teamAId: a,
        teamBId: b,
      })
      .expect(201);

    expect(res.body.intent).toBe('team_head_to_head');
    expect(res.body.llmNarrative).toBe(false);
    expect(res.body.verified.teamAWins).toBe(1);
    expect(res.body.sources.some((s: { type: string }) => s.type === 'head_to_head')).toBe(true);
    expect(res.body.answerText).toMatch(/Team Alpha/);
  });

  it('POST /assistant/ask — match prediction summary', async () => {
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:asst-1',
        status: 'upcoming',
        teams: ['sr:competitor:1', 'sr:competitor:2'],
        teamNames: ['Home XI', 'Away XI'],
        tournament: 'PSL',
        lastEvent: { type: 'none', runs: 0, over: 0 },
      },
    });
    await ctx.prisma.predictionRun.create({
      data: {
        matchId: 'sr:match:asst-1',
        stage: PREDICTION_STAGE.PRE_MATCH,
        modelVersion: PREDICTION_MODELS.PREMATCH,
        result: {
          create: {
            homeWinProb: 0.62,
            awayWinProb: 0.38,
            confidence: 0.7,
            calibrationBand: 'medium',
            explanation: {},
            scoreRange: { low: 140, expected: 160, high: 180 },
            topBatters: [],
            topBowlers: [],
            xi: {},
          },
        },
      },
    });

    const res = await ctx.agent
      .post('/assistant/ask')
      .send({
        question: 'Win probability for sr:match:asst-1',
        matchId: 'sr:match:asst-1',
      })
      .expect(201);

    expect(res.body.intent).toBe('match_prediction_summary');
    expect(res.body.verified.homeWinProb).toBe(0.62);
    expect(res.body.sources[0].type).toBe('prediction_run');
  });

  it('POST /assistant/ask — live change uses two runs', async () => {
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:asst-live',
        status: 'live',
        teams: ['sr:competitor:1', 'sr:competitor:2'],
        teamNames: ['Home XI', 'Away XI'],
        tournament: 'PSL',
        lastEvent: { type: 'runs', runs: 1, over: 10 },
      },
    });
    await ctx.prisma.predictionRun.create({
      data: {
        matchId: 'sr:match:asst-live',
        stage: PREDICTION_STAGE.LIVE,
        modelVersion: PREDICTION_MODELS.LIVE,
        result: {
          create: {
            homeWinProb: 0.5,
            awayWinProb: 0.5,
            confidence: 0.5,
            calibrationBand: 'low',
            explanation: { over: 10, reasons: ['even'] },
            scoreRange: {},
            topBatters: [],
            topBowlers: [],
            xi: {},
          },
        },
      },
    });
    await ctx.prisma.predictionRun.create({
      data: {
        matchId: 'sr:match:asst-live',
        stage: PREDICTION_STAGE.LIVE,
        modelVersion: PREDICTION_MODELS.LIVE,
        result: {
          create: {
            homeWinProb: 0.58,
            awayWinProb: 0.42,
            confidence: 0.55,
            calibrationBand: 'medium',
            explanation: { over: 11, reasons: ['wicket'] },
            scoreRange: {},
            topBatters: [],
            topBowlers: [],
            xi: {},
          },
        },
      },
    });

    const res = await ctx.agent
      .post('/assistant/ask')
      .send({
        question: 'Why did win probability change sr:match:asst-live?',
      })
      .expect(201);

    expect(res.body.intent).toBe('live_win_prob_explain');
    expect(res.body.verified.homeWinProbDelta).toBeCloseTo(0.08);
    expect(res.body.sources).toHaveLength(2);
  });

  it('POST /assistant/ask — player compare from PSL leaders', async () => {
    await ctx.prisma.player.createMany({
      data: [
        { id: 'sr:player:cmp-a', fullName: 'Babar Azam', nationality: 'Pakistan' },
        { id: 'sr:player:cmp-b', fullName: 'Fakhar Zaman', nationality: 'Pakistan' },
      ],
    });
    await ctx.prisma.pslLeader.createMany({
      data: [
        {
          seasonId: 'sr:season:140552',
          category: 'batting',
          stat: 'runs',
          rank: 1,
          playerId: 'sr:player:cmp-a',
          playerName: 'Babar Azam',
          value: 500,
        },
        {
          seasonId: 'sr:season:140552',
          category: 'batting',
          stat: 'runs',
          rank: 2,
          playerId: 'sr:player:cmp-b',
          playerName: 'Fakhar Zaman',
          value: 420,
        },
      ],
    });

    const res = await ctx.agent
      .post('/assistant/ask')
      .send({
        question: 'Compare players Babar Azam vs Fakhar Zaman',
        season: '2026',
      })
      .expect(201);

    expect(res.body.intent).toBe('player_compare');
    expect(res.body.verified.comparisons).toHaveLength(1);
    expect(res.body.verified.comparisons[0].leader).toBe('a');
  });

  it('POST /assistant/ask — PSL qualification focus team', async () => {
    await ctx.prisma.team.createMany({
      data: [
        { id: 'sr:team:q1', name: 'Lahore Qalandars', abbr: 'LQ', country: 'PK' },
        { id: 'sr:team:q2', name: 'Karachi Kings', abbr: 'KK', country: 'PK' },
        { id: 'sr:team:q3', name: 'Islamabad United', abbr: 'IU', country: 'PK' },
        { id: 'sr:team:q4', name: 'Peshawar Zalmi', abbr: 'PZ', country: 'PK' },
        { id: 'sr:team:q5', name: 'Multan Sultans', abbr: 'MS', country: 'PK' },
      ],
    });
    const seasonId = 'sr:season:140552';
    const standingRows = [
      { teamId: 'sr:team:q1', teamName: 'Lahore Qalandars', abbr: 'LQ', rank: 1, points: 20 },
      { teamId: 'sr:team:q2', teamName: 'Karachi Kings', abbr: 'KK', rank: 2, points: 18 },
      { teamId: 'sr:team:q3', teamName: 'Islamabad United', abbr: 'IU', rank: 3, points: 16 },
      { teamId: 'sr:team:q4', teamName: 'Peshawar Zalmi', abbr: 'PZ', rank: 4, points: 14 },
      { teamId: 'sr:team:q5', teamName: 'Multan Sultans', abbr: 'MS', rank: 5, points: 12 },
    ];
    for (const row of standingRows) {
      await ctx.prisma.pslStanding.create({
        data: {
          seasonId,
          teamId: row.teamId,
          teamName: row.teamName,
          teamAbbr: row.abbr,
          rank: row.rank,
          played: 10,
          points: row.points,
          netRunRate: 0.1 * row.rank,
        },
      });
    }
    await ctx.prisma.pslFixture.createMany({
      data: [
        {
          matchId: 'sr:match:ms-rem-1',
          seasonId,
          status: 'not_started',
          homeTeamId: 'sr:team:q5',
          awayTeamId: 'sr:team:q1',
        },
        {
          matchId: 'sr:match:ms-rem-2',
          seasonId,
          status: 'not_started',
          homeTeamId: 'sr:team:q2',
          awayTeamId: 'sr:team:q5',
        },
      ],
    });

    const res = await ctx.agent
      .post('/assistant/ask')
      .send({
        question: 'Can Multan Sultans qualify for PSL 2026 playoffs?',
      })
      .expect(201);

    expect(res.body.intent).toBe('standings_qualification');
    expect(res.body.verified.focusTeam.teamAbbr).toBe('MS');
    expect(res.body.verified.focusTeam.mathematicallyAlive).toBe(true);
  });

  it('POST /assistant/ask — player recent form from match_summary', async () => {
    await ctx.prisma.team.create({
      data: { id: 'sr:team:rf', name: 'Karachi Kings', abbr: 'KK', country: 'PK' },
    });
    await ctx.prisma.player.create({
      data: {
        id: 'sr:player:rf1',
        fullName: 'Babar Azam',
        teamId: 'sr:team:rf',
        nationality: 'Pakistan',
      },
    });
    await ctx.prisma.match.create({
      data: {
        matchId: 'sr:match:rf1',
        status: 'completed',
        teams: ['KK', 'LQ'],
        teamNames: ['Karachi Kings', 'Lahore Qalandars'],
        tournament: 'PSL',
        scheduled: '2026-03-01T00:00:00Z',
        lastEvent: { type: 'none', runs: 0, over: 0 },
      },
    });
    await ctx.prisma.sportEventRecord.create({
      data: {
        kind: 'match_summary',
        scopeKey: 'sr:match:rf1',
        eventId: 'sr:match:rf1',
        status: 'closed',
        payload: {
          statistics: {
            innings: [
              {
                teams: [
                  {
                    statistics: {
                      batting: {
                        players: [
                          {
                            id: 'sr:player:rf1',
                            name: 'Babar Azam',
                            runs: 88,
                            balls: 52,
                            strike_rate: 169.2,
                            dismissal: 'not out',
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    });

    const res = await ctx.agent
      .post('/assistant/ask')
      .send({ question: 'Recent form of Babar Azam last 5 matches' })
      .expect(201);

    expect(res.body.intent).toBe('player_recent_form');
    expect(res.body.verified.recentMatches).toHaveLength(1);
    expect(res.body.verified.recentMatches[0].batting.runs).toBe(88);
    expect(res.body.verified.recentMatches[0].dataSource).toBe('match_summary');
  });
});
