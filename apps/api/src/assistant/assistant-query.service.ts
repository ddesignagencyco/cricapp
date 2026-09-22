import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AssistantAnswer,
  AssistantIntent,
  AssistantSource,
  AssistantUnavailable,
} from '@cricapp/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { HeadToHeadService } from '../head-to-head/head-to-head.service.js';
import { PredictionsService, type PredictionRunView } from '../predictions/predictions.service.js';
import { PlayersService } from '../players/players.service.js';
import { TeamsService } from '../teams/teams.service.js';
import { resolveSeason } from '../psl/psl.constants.js';
import { isPlausibleQualificationTeamFocus, type ResolvedAssistantIntent } from './assistant-intent.util.js';
import { summarizeHeadToHeadPayload } from './h2h-verified.util.js';
import { buildPlayerCompareVerified } from './player-compare.util.js';
import {
  buildPslQualificationVerified,
  remainingFixturesByTeam,
} from './psl-qualification.util.js';
import {
  RECENT_FORM_DISPLAY_LIMIT,
  RECENT_FORM_SCAN_LIMIT,
  aggregatePlayerStatsFromTimeline,
  buildRecentFormVerified,
  extractPlayerStatsFromMatchSummary,
  opponentLabelFromMatch,
  type PlayerMatchFormRow,
  type RecentMatchCandidate,
  sortRecentMatchCandidates,
} from './player-recent-form.util.js';
import { Prisma } from '@prisma/client';
import {
  pickPlayerIdFromCandidates,
  playerNameSearchVariants,
} from './assistant-player-resolve.util.js';
import {
  pickTeamIdFromCandidates,
  teamNameSearchVariants,
} from './assistant-team-resolve.util.js';

@Injectable()
export class AssistantQueryService {
  constructor(
    private readonly headToHead: HeadToHeadService,
    private readonly predictions: PredictionsService,
    private readonly teams: TeamsService,
    private readonly players: PlayersService,
    private readonly prisma: PrismaService,
  ) {}

  async buildAnswer(resolved: ResolvedAssistantIntent): Promise<AssistantAnswer> {
    switch (resolved.intent) {
      case 'team_head_to_head':
        return this.teamHeadToHead(resolved);
      case 'match_prediction_summary':
        return this.matchPredictionSummary(resolved);
      case 'live_win_prob_explain':
        return this.liveWinProbExplain(resolved);
      case 'player_compare':
        return this.playerCompare(resolved);
      case 'standings_qualification':
        return this.standingsQualification(resolved);
      case 'player_recent_form':
        return this.playerRecentForm(resolved);
      default:
        return this.unknownIntent(resolved);
    }
  }

  private async teamHeadToHead(resolved: ResolvedAssistantIntent): Promise<AssistantAnswer> {
    const unavailable: AssistantUnavailable[] = [];
    const teamAId = await this.resolveTeamId(resolved.teamAQuery);
    const teamBId = await this.resolveTeamId(resolved.teamBQuery);

    if (!teamAId || !teamBId) {
      if (!teamAId) {
        unavailable.push({
          field: 'teamA',
          reason: resolved.teamAQuery
            ? `No team matched "${resolved.teamAQuery}" in our database.`
            : 'Could not identify the first team — try "Team A vs Team B" or pass teamAId.',
        });
      }
      if (!teamBId) {
        unavailable.push({
          field: 'teamB',
          reason: resolved.teamBQuery
            ? `No team matched "${resolved.teamBQuery}" in our database.`
            : 'Could not identify the second team — try "Team A vs Team B" or pass teamBId.',
        });
      }
      return {
        intent: 'team_head_to_head',
        answerText: this.templateUnavailable('team head-to-head', unavailable),
        verified: {},
        sources: [],
        unavailable,
      };
    }

    if (teamAId === teamBId) {
      unavailable.push({ field: 'teams', reason: 'Please choose two different teams.' });
      return {
        intent: 'team_head_to_head',
        answerText: this.templateUnavailable('team head-to-head', unavailable),
        verified: {},
        sources: [],
        unavailable,
      };
    }

    try {
      const h2h = await this.headToHead.get(teamAId, teamBId);
      const verified = summarizeHeadToHeadPayload(h2h.teamAId, h2h.teamBId, h2h.payload);
      const sources: AssistantSource[] = [
        { type: 'head_to_head', teamAId: h2h.teamAId, teamBId: h2h.teamBId },
      ];
      return {
        intent: 'team_head_to_head',
        answerText: this.templateHeadToHead(verified),
        verified: verified as unknown as Record<string, unknown>,
        sources,
        unavailable,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        unavailable.push({
          field: 'headToHead',
          reason: `No head-to-head records are stored for these teams yet.`,
        });
        return {
          intent: 'team_head_to_head',
          answerText: this.templateUnavailable('team head-to-head', unavailable),
          verified: { teamAId, teamBId },
          sources: [
            { type: 'team', id: teamAId },
            { type: 'team', id: teamBId },
          ],
          unavailable,
        };
      }
      throw err;
    }
  }

  private async matchPredictionSummary(resolved: ResolvedAssistantIntent): Promise<AssistantAnswer> {
    const unavailable: AssistantUnavailable[] = [];
    const matchId = resolved.matchId;
    if (!matchId) {
      unavailable.push({
        field: 'matchId',
        reason: 'Include a match id (sr:match:…) or ask about a specific fixture we can link.',
      });
      return {
        intent: 'match_prediction_summary',
        answerText: this.templateUnavailable('match prediction', unavailable),
        verified: {},
        sources: [],
        unavailable,
      };
    }

    try {
      const latest = await this.predictions.getLatest(matchId);
      const run = latest.live ?? latest.preMatch;
      if (!run) {
        unavailable.push({
          field: 'prediction',
          reason: `No prediction runs are stored for ${matchId}.`,
        });
        return {
          intent: 'match_prediction_summary',
          answerText: this.templateUnavailable('match prediction', unavailable),
          verified: { matchId },
          sources: [{ type: 'match', id: matchId }],
          unavailable,
        };
      }

      const verified = this.predictionRunVerified(matchId, run);
      const sources: AssistantSource[] = [
        {
          type: 'prediction_run',
          id: run.runId,
          matchId,
          createdAt: run.createdAt.toISOString(),
          modelVersion: run.modelVersion,
          stage: run.stage,
        },
      ];
      return {
        intent: 'match_prediction_summary',
        answerText: this.templatePredictionSummary(verified),
        verified,
        sources,
        unavailable,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        unavailable.push({
          field: 'prediction',
          reason: `No prediction runs are stored for ${matchId}.`,
        });
        return {
          intent: 'match_prediction_summary',
          answerText: this.templateUnavailable('match prediction', unavailable),
          verified: { matchId },
          sources: [{ type: 'match', id: matchId }],
          unavailable,
        };
      }
      throw err;
    }
  }

  private async liveWinProbExplain(resolved: ResolvedAssistantIntent): Promise<AssistantAnswer> {
    const unavailable: AssistantUnavailable[] = [];
    const matchId = resolved.matchId;
    if (!matchId) {
      unavailable.push({
        field: 'matchId',
        reason: 'Include a match id to explain how win probability changed.',
      });
      return {
        intent: 'live_win_prob_explain',
        answerText: this.templateUnavailable('live win-probability change', unavailable),
        verified: {},
        sources: [],
        unavailable,
      };
    }

    const history = await this.predictions.getHistory(matchId);
    const runs = history.runs;
    if (runs.length < 2) {
      unavailable.push({
        field: 'history',
        reason:
          runs.length === 0
            ? `No prediction history exists for ${matchId}.`
            : 'Need at least two prediction runs to explain a change.',
      });
      return {
        intent: 'live_win_prob_explain',
        answerText: this.templateUnavailable('live win-probability change', unavailable),
        verified: { matchId, runCount: runs.length },
        sources: runs.map((r) => this.runSource(matchId, r)),
        unavailable,
      };
    }

    const liveRuns = runs.filter((r) => r.stage === 'live');
    const previous = liveRuns.length >= 2 ? liveRuns[liveRuns.length - 2]! : runs[runs.length - 2]!;
    const latest = liveRuns.length >= 2 ? liveRuns[liveRuns.length - 1]! : runs[runs.length - 1]!;

    const prevExpl = previous.explanation ?? {};
    const latestExpl = latest.explanation ?? {};
    const verified: Record<string, unknown> = {
      matchId,
      previousRunId: previous.runId,
      latestRunId: latest.runId,
      previousCreatedAt: previous.createdAt.toISOString(),
      latestCreatedAt: latest.createdAt.toISOString(),
      previousHomeWinProb: previous.homeWinProb,
      previousAwayWinProb: previous.awayWinProb,
      latestHomeWinProb: latest.homeWinProb,
      latestAwayWinProb: latest.awayWinProb,
      homeWinProbDelta: latest.homeWinProb - previous.homeWinProb,
      awayWinProbDelta: latest.awayWinProb - previous.awayWinProb,
      previousOver: typeof prevExpl.over === 'number' ? prevExpl.over : null,
      latestOver: typeof latestExpl.over === 'number' ? latestExpl.over : null,
      previousReasons: Array.isArray(prevExpl.reasons) ? prevExpl.reasons : [],
      latestReasons: Array.isArray(latestExpl.reasons) ? latestExpl.reasons : [],
      latestExplanation: latestExpl,
    };

    return {
      intent: 'live_win_prob_explain',
      answerText: this.templateLiveChange(verified),
      verified,
      sources: [this.runSource(matchId, previous), this.runSource(matchId, latest)],
      unavailable,
    };
  }

  private async playerCompare(resolved: ResolvedAssistantIntent): Promise<AssistantAnswer> {
    const unavailable: AssistantUnavailable[] = [];
    const seasonMeta = resolveSeason(resolved.season);
    const playerAId = await this.resolvePlayerId(resolved.playerAQuery);
    const playerBId = await this.resolvePlayerId(resolved.playerBQuery);

    if (!playerAId || !playerBId) {
      if (!playerAId) {
        unavailable.push({
          field: 'playerA',
          reason: resolved.playerAQuery
            ? `No player matched "${resolved.playerAQuery}".`
            : 'Name the first player or pass playerAId.',
        });
      }
      if (!playerBId) {
        unavailable.push({
          field: 'playerB',
          reason: resolved.playerBQuery
            ? `No player matched "${resolved.playerBQuery}".`
            : 'Name the second player or pass playerBId.',
        });
      }
      return {
        intent: 'player_compare',
        answerText: this.templateUnavailable('player comparison', unavailable),
        verified: { seasonId: seasonMeta.id },
        sources: [{ type: 'psl_standings', id: seasonMeta.id }],
        unavailable,
      };
    }

    if (playerAId === playerBId) {
      unavailable.push({ field: 'players', reason: 'Please choose two different players.' });
      return {
        intent: 'player_compare',
        answerText: this.templateUnavailable('player comparison', unavailable),
        verified: {},
        sources: [],
        unavailable,
      };
    }

    const [playerA, playerB, leaderRows] = await Promise.all([
      this.prisma.player.findUnique({ where: { id: playerAId } }),
      this.prisma.player.findUnique({ where: { id: playerBId } }),
      this.prisma.pslLeader.findMany({
        where: { seasonId: seasonMeta.id, playerId: { in: [playerAId, playerBId] } },
      }),
    ]);

    if (!playerA || !playerB) {
      unavailable.push({ field: 'player', reason: 'One or both players were not found in our database.' });
      return {
        intent: 'player_compare',
        answerText: this.templateUnavailable('player comparison', unavailable),
        verified: {},
        sources: [],
        unavailable,
      };
    }

    const rowsA = leaderRows
      .filter((r) => r.playerId === playerAId)
      .map((r) => ({ category: r.category, stat: r.stat, rank: r.rank, value: r.value }));
    const rowsB = leaderRows
      .filter((r) => r.playerId === playerBId)
      .map((r) => ({ category: r.category, stat: r.stat, rank: r.rank, value: r.value }));

    if (rowsA.length === 0 && rowsB.length === 0) {
      unavailable.push({
        field: 'pslLeaders',
        reason: `No PSL leader stats are stored for ${seasonMeta.name} for these players.`,
      });
    }

    const verified = buildPlayerCompareVerified({
      seasonId: seasonMeta.id,
      seasonName: seasonMeta.name,
      playerA: { id: playerA.id, name: playerA.fullName },
      playerB: { id: playerB.id, name: playerB.fullName },
      rowsA,
      rowsB,
    });

    if (verified.comparisons.length === 0 && unavailable.length === 0) {
      unavailable.push({
        field: 'overlap',
        reason: 'Players have no shared PSL leader stat categories in our database for this season.',
      });
    }

    const sources: AssistantSource[] = [
      { type: 'player', id: playerA.id },
      { type: 'player', id: playerB.id },
      { type: 'psl_standings', id: seasonMeta.id },
    ];

    return {
      intent: 'player_compare',
      answerText:
        verified.comparisons.length > 0
          ? this.templatePlayerCompare(verified)
          : this.templateUnavailable('player comparison', unavailable),
      verified: verified as unknown as Record<string, unknown>,
      sources,
      unavailable,
    };
  }

  private async standingsQualification(resolved: ResolvedAssistantIntent): Promise<AssistantAnswer> {
    const unavailable: AssistantUnavailable[] = [];
    const seasonMeta = resolveSeason(resolved.season);
    const teamFocusQuery =
      resolved.teamQuery && isPlausibleQualificationTeamFocus(resolved.teamQuery)
        ? resolved.teamQuery
        : undefined;
    const focusTeamId = teamFocusQuery ? await this.resolveTeamId(teamFocusQuery) : null;

    const [standingRows, fixtureRows] = await Promise.all([
      this.prisma.pslStanding.findMany({
        where: { seasonId: seasonMeta.id },
        orderBy: [{ rank: 'asc' }],
      }),
      this.prisma.pslFixture.findMany({ where: { seasonId: seasonMeta.id } }),
    ]);

    if (standingRows.length === 0) {
      unavailable.push({
        field: 'standings',
        reason: `No PSL standings are stored for ${seasonMeta.name}.`,
      });
      return {
        intent: 'standings_qualification',
        answerText: this.templateUnavailable('PSL qualification', unavailable),
        verified: { seasonId: seasonMeta.id, seasonName: seasonMeta.name },
        sources: [{ type: 'psl_standings', id: seasonMeta.id }],
        unavailable,
      };
    }

    const remainingByTeam = remainingFixturesByTeam(fixtureRows);
    const verified = buildPslQualificationVerified({
      seasonId: seasonMeta.id,
      seasonName: seasonMeta.name,
      standings: standingRows.map((r) => ({
        teamId: r.teamId,
        teamName: r.teamName,
        teamAbbr: r.teamAbbr,
        rank: r.rank,
        played: r.played,
        points: r.points,
        netRunRate: r.netRunRate,
      })),
      remainingByTeam,
      focusTeamId: focusTeamId ?? undefined,
    });

    if (teamFocusQuery && !focusTeamId) {
      unavailable.push({
        field: 'focusTeam',
        reason: `No team matched "${teamFocusQuery}" for a focused qualification answer.`,
      });
    }

    const sources: AssistantSource[] = [{ type: 'psl_standings', id: seasonMeta.id }];
    if (focusTeamId) {
      sources.push({ type: 'team', id: focusTeamId });
    }

    return {
      intent: 'standings_qualification',
      answerText: this.templateQualification(verified, unavailable),
      verified: verified as unknown as Record<string, unknown>,
      sources,
      unavailable,
    };
  }

  private async playerRecentForm(resolved: ResolvedAssistantIntent): Promise<AssistantAnswer> {
    const unavailable: AssistantUnavailable[] = [];
    const playerId = await this.resolvePlayerId(resolved.playerAQuery);
    if (!playerId) {
      unavailable.push({
        field: 'player',
        reason: resolved.playerAQuery
          ? `No player matched "${resolved.playerAQuery}".`
          : 'Name a player ("recent form of Babar Azam") or pass playerId.',
      });
      return {
        intent: 'player_recent_form',
        answerText: this.templateUnavailable('recent form', unavailable),
        verified: {},
        sources: [],
        unavailable,
      };
    }

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true },
    });
    if (!player) {
      unavailable.push({ field: 'player', reason: `Player ${playerId} is not in our database.` });
      return {
        intent: 'player_recent_form',
        answerText: this.templateUnavailable('recent form', unavailable),
        verified: {},
        sources: [{ type: 'player', id: playerId }],
        unavailable,
      };
    }

    const seasonMeta = resolveSeason(resolved.season);
    const teamId = player.team?.id ?? null;
    const teamAbbr = player.team?.abbr ?? null;
    const teamName = player.team?.name ?? null;

    const matchCandidates = await this.loadRecentMatchCandidatesForTeam({
      teamId,
      teamAbbr,
      teamName,
      seasonId: seasonMeta.id,
    });

    if (matchCandidates.length === 0) {
      const leaderAnswer = await this.recentFormFromPslLeaders(player.id, player.fullName, seasonMeta);
      if (leaderAnswer) {
        return leaderAnswer;
      }
      unavailable.push({
        field: 'matches',
        reason: teamName
          ? `No completed PSL or global matches found for ${teamName} in our database.`
          : `${player.fullName} has no team link and no PSL leader row for ${seasonMeta.name}.`,
      });
      return {
        intent: 'player_recent_form',
        answerText: this.templateUnavailable('recent form', unavailable),
        verified: { playerId: player.id, playerName: player.fullName, seasonName: seasonMeta.name },
        sources: [{ type: 'player', id: player.id }, ...(teamId ? [{ type: 'team' as const, id: teamId }] : [])],
        unavailable,
      };
    }

    const matchIds = matchCandidates.map((m) => m.matchId);
    const [summaryRows, timelineRows] = await Promise.all([
      this.prisma.sportEventRecord.findMany({
        where: { eventId: { in: matchIds }, kind: 'match_summary' },
      }),
      this.prisma.matchTimeline.findMany({ where: { matchId: { in: matchIds } } }),
    ]);
    const summaryByMatch = new Map(summaryRows.map((r) => [r.eventId, r.payload as Record<string, unknown>]));
    const timelineByMatch = new Map(timelineRows.map((r) => [r.matchId, r.payload as Record<string, unknown>]));

    const formRows: PlayerMatchFormRow[] = [];
    for (const match of matchCandidates) {
      if (formRows.length >= RECENT_FORM_DISPLAY_LIMIT) break;
      const opponent = opponentLabelFromMatch(match.teamNames, match.teamAbbrs, match.playerTeamAbbr);

      const summaryPayload = summaryByMatch.get(match.matchId);
      let batting = null;
      let bowling = null;
      let dataSource: PlayerMatchFormRow['dataSource'] = 'match_summary';

      if (summaryPayload) {
        const extracted = extractPlayerStatsFromMatchSummary(
          summaryPayload,
          player.id,
          player.fullName,
        );
        batting = extracted.batting;
        bowling = extracted.bowling;
      }

      if (!batting && !bowling) {
        const timelinePayload = timelineByMatch.get(match.matchId);
        if (timelinePayload) {
          const extracted = aggregatePlayerStatsFromTimeline(timelinePayload, player.id, player.fullName);
          batting = extracted.batting;
          bowling = extracted.bowling;
          dataSource = 'timeline';
        }
      }

      if (!batting && !bowling) continue;

      formRows.push({
        matchId: match.matchId,
        scheduled: match.scheduled,
        tournament: match.tournament,
        opponentLabel: opponent,
        dataSource,
        batting,
        bowling,
      });
    }

    if (formRows.length === 0) {
      const leaderAnswer = await this.recentFormFromPslLeaders(player.id, player.fullName, seasonMeta);
      if (leaderAnswer) {
        return leaderAnswer;
      }
      unavailable.push({
        field: 'scorecard',
        reason:
          `${matchCandidates.length} recent fixture(s) on file but no per-player scorecard in match_summary or timeline yet.`,
      });
    }

    const verified = buildRecentFormVerified({
      playerId: player.id,
      playerName: player.fullName,
      rows: formRows,
      matchLimit: RECENT_FORM_DISPLAY_LIMIT,
    });

    const sources: AssistantSource[] = [
      { type: 'player', id: player.id },
      ...(teamId ? [{ type: 'team' as const, id: teamId }] : []),
      ...formRows.map((row) => ({ type: 'match' as const, id: row.matchId, matchId: row.matchId })),
    ];

    return {
      intent: 'player_recent_form',
      answerText:
        formRows.length > 0
          ? this.templateRecentForm(verified)
          : this.templateUnavailable('recent form', unavailable),
      verified: verified as unknown as Record<string, unknown>,
      sources,
      unavailable,
    };
  }

  private unknownIntent(resolved: ResolvedAssistantIntent): AssistantAnswer {
    const unavailable: AssistantUnavailable[] = resolved.outOfScopeReason
      ? [{ field: 'scope', reason: resolved.outOfScopeReason }]
      : [
          {
            field: 'intent',
            reason:
              'Could not classify the question. Try head-to-head ("Lahore vs Karachi H2H"), PSL standings/cutoff, recent form, player compare, match prediction, or pass intent + ids.',
          },
        ];
    return {
      intent: 'unknown',
      answerText: this.templateUnavailable('your question', unavailable),
      verified: {},
      sources: [],
      unavailable,
    };
  }

  private async loadRecentMatchCandidatesForTeam(input: {
    teamId: string | null;
    teamAbbr: string | null;
    teamName: string | null;
    seasonId: string;
  }): Promise<RecentMatchCandidate[]> {
    const byId = new Map<string, RecentMatchCandidate>();

    if (input.teamAbbr || input.teamId || input.teamName) {
      const nameToken = input.teamName?.split(/\s+/).pop() ?? '';
      const matchRows = await this.prisma.$queryRaw<
        Array<{
          match_id: string;
          teams: unknown;
          team_names: unknown;
          tournament: string | null;
          scheduled: string | null;
        }>
      >(
        Prisma.sql`
          SELECT match_id, teams, team_names, tournament, scheduled
          FROM matches
          WHERE status = 'completed'
            AND (
              ${input.teamAbbr ? Prisma.sql`teams @> ${JSON.stringify([input.teamAbbr])}::jsonb` : Prisma.sql`FALSE`}
              ${input.teamId ? Prisma.sql` OR teams @> ${JSON.stringify([input.teamId])}::jsonb` : Prisma.empty}
              ${
                nameToken
                  ? Prisma.sql` OR team_names::text ILIKE ${'%' + nameToken + '%'}`
                  : Prisma.empty
              }
            )
          ORDER BY scheduled DESC NULLS LAST
          LIMIT ${RECENT_FORM_SCAN_LIMIT}
        `,
      );

      for (const row of matchRows) {
        const teamNames = Array.isArray(row.team_names) ? row.team_names.map(String) : [];
        const teamAbbrs = Array.isArray(row.teams) ? row.teams.map(String) : [];
        byId.set(row.match_id, {
          matchId: row.match_id,
          scheduled: row.scheduled,
          tournament: row.tournament,
          teamNames,
          teamAbbrs,
          playerTeamAbbr: input.teamAbbr,
        });
      }
    }

    if (input.teamId) {
      const fixtures = await this.prisma.pslFixture.findMany({
        where: {
          seasonId: input.seasonId,
          OR: [{ homeTeamId: input.teamId }, { awayTeamId: input.teamId }],
          status: { in: ['closed', 'completed'] },
        },
        orderBy: { scheduled: 'desc' },
        take: RECENT_FORM_SCAN_LIMIT,
      });

      for (const f of fixtures) {
        if (byId.has(f.matchId)) continue;
        const isHome = f.homeTeamId === input.teamId;
        byId.set(f.matchId, {
          matchId: f.matchId,
          scheduled: f.scheduled,
          tournament: 'Pakistan Super League',
          teamNames: [f.homeTeamName, f.awayTeamName].filter((n): n is string => Boolean(n)),
          teamAbbrs: [f.homeTeamAbbr, f.awayTeamAbbr].filter((a): a is string => Boolean(a)),
          playerTeamAbbr: isHome ? (f.homeTeamAbbr ?? input.teamAbbr) : (f.awayTeamAbbr ?? input.teamAbbr),
        });
      }
    }

    return sortRecentMatchCandidates([...byId.values()]).slice(0, RECENT_FORM_SCAN_LIMIT);
  }

  private async recentFormFromPslLeaders(
    playerId: string,
    playerName: string,
    seasonMeta: { id: string; name: string },
  ): Promise<AssistantAnswer | null> {
    const leaderRows = await this.prisma.pslLeader.findMany({
      where: { seasonId: seasonMeta.id, playerId },
      orderBy: [{ category: 'asc' }, { stat: 'asc' }],
    });
    if (leaderRows.length === 0) return null;

    const highlights = leaderRows.slice(0, 8).map((r) => ({
      category: r.category,
      stat: r.stat,
      rank: r.rank,
      value: r.value,
    }));

    const verified = {
      playerId,
      playerName,
      seasonId: seasonMeta.id,
      seasonName: seasonMeta.name,
      dataSource: 'psl_leaders' as const,
      leaderStats: highlights,
    };

    return {
      intent: 'player_recent_form',
      answerText: this.templateRecentFormSeasonLeaders(verified),
      verified: verified as unknown as Record<string, unknown>,
      sources: [
        { type: 'player', id: playerId },
        { type: 'psl_standings', id: seasonMeta.id },
      ],
      unavailable: [],
    };
  }

  private async resolveTeamId(query: string | undefined): Promise<string | null> {
    if (!query?.trim()) return null;
    const q = query.trim();
    if (q.startsWith('sr:competitor:') || q.startsWith('sr:team:')) return q;

    const candidates: Array<{ id: string; name: string; abbr: string; country?: string | null }> =
      [];
    const seen = new Set<string>();
    for (const variant of teamNameSearchVariants(q)) {
      const res = await this.teams.search({ q: variant, page: 1, limit: 12 });
      for (const row of res.data as Array<{
        id: string;
        name: string;
        abbr: string;
        country?: string | null;
      }>) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          candidates.push(row);
        }
      }
      const picked = pickTeamIdFromCandidates(q, candidates);
      if (picked) return picked;
    }
    return pickTeamIdFromCandidates(q, candidates);
  }

  private async resolvePlayerId(query: string | undefined): Promise<string | null> {
    if (!query?.trim()) return null;
    const q = query.trim();
    if (q.startsWith('sr:player:')) return q;

    const candidates: Array<{ id: string; fullName: string }> = [];
    const seen = new Set<string>();
    for (const variant of playerNameSearchVariants(q)) {
      const res = await this.players.search({ q: variant, page: 1, limit: 8 });
      for (const row of res.data as Array<{ id: string; fullName: string }>) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          candidates.push(row);
        }
      }
      const picked = pickPlayerIdFromCandidates(candidates, q);
      if (picked) return picked;
    }
    return pickPlayerIdFromCandidates(candidates, q);
  }

  private predictionRunVerified(matchId: string, run: PredictionRunView): Record<string, unknown> {
    return {
      matchId,
      runId: run.runId,
      stage: run.stage,
      modelVersion: run.modelVersion,
      createdAt: run.createdAt.toISOString(),
      homeWinProb: run.homeWinProb,
      awayWinProb: run.awayWinProb,
      confidence: run.confidence,
      calibrationBand: run.calibrationBand,
      explanation: run.explanation,
      scoreRange: run.scoreRange,
      momentum: run.momentum,
      pressureIndex: run.pressureIndex,
    };
  }

  private runSource(matchId: string, run: PredictionRunView): AssistantSource {
    return {
      type: 'prediction_run',
      id: run.runId,
      matchId,
      createdAt: run.createdAt.toISOString(),
      modelVersion: run.modelVersion,
      stage: run.stage,
    };
  }

  templateHeadToHead(verified: {
    teamAName: string;
    teamBName: string;
    teamAWins: number;
    teamBWins: number;
    draws: number;
    totalMeetings: number;
    upcomingCount: number;
  }): string {
    return (
      `Here's what our records show for ${verified.teamAName} against ${verified.teamBName}: ` +
      `${verified.teamAName} lead ${verified.teamAWins}–${verified.teamBWins}` +
      (verified.draws ? ` (${verified.draws} no-result/draw)` : '') +
      ` in ${verified.totalMeetings} completed meeting(s)` +
      (verified.upcomingCount ? `, with ${verified.upcomingCount} more scheduled.` : '.')
    );
  }

  templatePredictionSummary(verified: Record<string, unknown>): string {
    const home = Math.round(Number(verified.homeWinProb) * 100);
    const away = Math.round(Number(verified.awayWinProb) * 100);
    const stage = String(verified.stage ?? 'unknown');
    return `Latest ${stage.replace('_', '-')} model run: home ${home}%, away ${away}% (confidence band ${String(verified.calibrationBand)}).`;
  }

  templateLiveChange(verified: Record<string, unknown>): string {
    const dHome = Number(verified.homeWinProbDelta);
    const sign = dHome >= 0 ? '+' : '';
    const pct = Math.round(dHome * 100);
    const reasons = verified.latestReasons as unknown[];
    const reasonText =
      Array.isArray(reasons) && reasons.length
        ? ` Latest factors: ${reasons.map(String).join(', ')}.`
        : '';
    return (
      `Home win probability moved ${sign}${pct} pts between the last two stored runs` +
      (verified.latestOver != null ? ` (latest over ${String(verified.latestOver)})` : '') +
      `.${reasonText}`
    );
  }

  templateUnavailable(topic: string, unavailable: AssistantUnavailable[]): string {
    const reasons = unavailable.map((u) => u.reason).join(' ');
    return (
      `I don't have enough in our database to answer that yet. ${reasons} ` +
      `Try full team names (India vs Pakistan), PSL franchises (Lahore vs Karachi), ` +
      `or player compare ("Compare players Babar Azam vs Mohammad Rizwan").`
    ).trim();
  }

  templateRecentForm(verified: {
    playerName: string;
    recentMatches: Array<{
      opponentLabel: string | null;
      batting: { runs: number | null; balls: number | null; notOut: boolean } | null;
      bowling: { wickets: number | null } | null;
      dataSource: string;
    }>;
    totals: { runs: number; wickets: number; matchesWithData: number };
  }): string {
    const parts = verified.recentMatches.map((m) => {
      const vs = m.opponentLabel ? ` vs ${m.opponentLabel}` : '';
      const bat =
        m.batting?.runs != null
          ? `${m.batting.runs}${m.batting.notOut ? '*' : ''}${m.batting.balls != null ? ` (${m.batting.balls}b)` : ''}`
          : '';
      const bowl = m.bowling?.wickets != null ? `${m.bowling.wickets} wkts` : '';
      const stat = [bat, bowl].filter(Boolean).join(', ') || 'no line';
      return `${stat}${vs} [${m.dataSource}]`;
    });
    return (
      `${verified.playerName} — last ${verified.totals.matchesWithData} stored match(es): ` +
      `${parts.join('; ')}. ` +
      `Totals in window: ${verified.totals.runs} runs` +
      (verified.totals.wickets ? `, ${verified.totals.wickets} wickets` : '') +
      '.'
    );
  }

  templatePlayerCompare(verified: {
    seasonName: string;
    playerA: { name: string };
    playerB: { name: string };
    comparisons: Array<{
      category: string;
      stat: string;
      playerAValue: number;
      playerBValue: number;
      leader: string;
    }>;
  }): string {
    const lines = verified.comparisons.slice(0, 6).map((c) => {
      const leaderName =
        c.leader === 'a' ? verified.playerA.name : c.leader === 'b' ? verified.playerB.name : 'tied';
      return `${c.category} ${c.stat}: ${verified.playerA.name} ${c.playerAValue}, ${verified.playerB.name} ${c.playerBValue} (edge: ${leaderName})`;
    });
    return (
      `For ${verified.seasonName}, here's how ${verified.playerA.name} and ${verified.playerB.name} stack up in our PSL leader boards: ` +
      lines.join('; ') +
      (verified.comparisons.length > 6 ? ` (Plus ${verified.comparisons.length - 6} more stat pairs in Details.)` : '')
    );
  }

  templateQualification(
    verified: {
      seasonName: string;
      playoffSpots: number;
      playoffCutoffPoints: number | null;
      focusTeam: {
        teamName: string;
        rank: number;
        points: number;
        netRunRate: number;
        inPlayoffPosition: boolean;
        mathematicallyAlive: boolean;
        remainingFixtures: number;
        maxPossiblePoints: number;
      } | null;
      pointsGapToCutoff: number | null;
    },
    unavailable: AssistantUnavailable[],
  ): string {
    if (verified.focusTeam) {
      const t = verified.focusTeam;
      const cutoff = verified.playoffCutoffPoints ?? '?';
      if (t.inPlayoffPosition) {
        return (
          `${t.teamName} are ${t.rank}${this.ordinal(t.rank)} in ${verified.seasonName} ` +
          `(${t.points} pts, NRR ${t.netRunRate.toFixed(3)}) — inside the top ${verified.playoffSpots} playoff spots per stored standings.`
        );
      }
      if (t.mathematicallyAlive) {
        return (
          `${t.teamName} are ${t.rank}${this.ordinal(t.rank)} with ${t.points} pts` +
          (verified.pointsGapToCutoff != null && verified.pointsGapToCutoff > 0
            ? ` (${verified.pointsGapToCutoff} behind the current ${verified.playoffSpots}th place on ${cutoff} pts)`
            : '') +
          `. Up to ${t.maxPossiblePoints} pts possible with ${t.remainingFixtures} fixture(s) left (win=${2} pts assumed). NRR may decide ties.`
        );
      }
      return (
        `${t.teamName} are ${t.rank}${this.ordinal(t.rank)} with ${t.points} pts` +
        ` and at most ${t.maxPossiblePoints} pts possible — not mathematically in the top ${verified.playoffSpots} on stored points/NRR.`
      );
    }
    const top = `Top ${verified.playoffSpots} playoff cutoff is at ${verified.playoffCutoffPoints ?? '?'} points (${verified.seasonName}).`;
    const extras = unavailable.filter((u) => u.field !== 'focusTeam');
    if (extras.length) {
      return `${top} ${extras.map((u) => u.reason).join(' ')}`;
    }
    return `${top} Ask about a specific team ("Can Lahore qualify?") for a focused scenario.`;
  }

  templateRecentFormSeasonLeaders(verified: {
    playerName: string;
    seasonName: string;
    leaderStats: Array<{ category: string; stat: string; rank: number; value: number }>;
  }): string {
    const lines = verified.leaderStats.map(
      (s) => `${s.category} ${s.stat}: ${s.value} (rank ${s.rank})`,
    );
    return (
      `${verified.playerName} — no per-match scorecards in our database yet; ` +
      `${verified.seasonName} PSL leader snapshot: ${lines.join('; ')}.`
    );
  }

  private ordinal(rank: number): string {
    const mod100 = rank % 100;
    if (mod100 >= 11 && mod100 <= 13) return 'th';
    switch (rank % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }
}
