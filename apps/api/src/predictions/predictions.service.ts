import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PREDICTION_MODELS } from '@cricapp/shared-types';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { PredictionNarrativeService } from './prediction-narrative.service.js';

export interface PredictionRunView {
  runId: string;
  matchId?: string;
  stage: string;
  modelVersion: string;
  createdAt: Date;
  homeWinProb: number;
  awayWinProb: number;
  confidence: number;
  calibrationBand: string;
  explanation: Record<string, unknown>;
  scoreRange: unknown;
  topBatters: unknown;
  topBowlers: unknown;
  xi: unknown;
  momentum: number | null;
  pressureIndex: number | null;
  partnershipProjection: unknown;
  wicketRisk: number | null;
  narrative: string | null;
  narrativeSource: string | null;
}

function mapRun(row: {
  matchId?: string;
  id: string;
  stage: string;
  modelVersion: string;
  createdAt: Date;
  result: {
    homeWinProb: number;
    awayWinProb: number;
    confidence: number;
    calibrationBand: string;
    explanation: unknown;
    scoreRange: unknown;
    topBatters: unknown;
    topBowlers: unknown;
    xi: unknown;
    momentum: number | null;
    pressureIndex: number | null;
    partnershipProjection: unknown;
    wicketRisk: number | null;
  } | null;
}): PredictionRunView | null {
  if (!row.result) return null;
  return {
    runId: row.id,
    ...(row.matchId ? { matchId: row.matchId } : {}),
    stage: row.stage,
    modelVersion: row.modelVersion,
    createdAt: row.createdAt,
    homeWinProb: row.result.homeWinProb,
    awayWinProb: row.result.awayWinProb,
    confidence: row.result.confidence,
    calibrationBand: row.result.calibrationBand,
    explanation: (row.result.explanation ?? {}) as Record<string, unknown>,
    scoreRange: row.result.scoreRange,
    topBatters: row.result.topBatters,
    topBowlers: row.result.topBowlers,
    xi: row.result.xi,
    momentum: row.result.momentum,
    pressureIndex: row.result.pressureIndex,
    partnershipProjection: row.result.partnershipProjection,
    wicketRisk: row.result.wicketRisk,
    narrative: null,
    narrativeSource: null,
  };
}

function extractWinnerId(payload: unknown, teamIds: string[]): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const event = (record.sport_event as Record<string, unknown> | undefined) ?? record;
  const status =
    (record.sport_event_status as Record<string, unknown> | undefined) ??
    (event.sport_event_status as Record<string, unknown> | undefined) ??
    {};
  const winner = (status.winner_id as string | undefined) ?? (record.winner_id as string | undefined);
  if (winner) return winner;
  const resultText = `${status.match_result_text ?? status.result ?? ''}`.toLowerCase();
  for (const id of teamIds) {
    if (id && resultText.includes(id.toLowerCase())) return id;
  }
  return null;
}

function detectFormat(tournament: string | null, matchStatus: string | null): string {
  const text = `${tournament ?? ''} ${matchStatus ?? ''}`.toLowerCase();
  if (/\btest\b/.test(text)) return 'test';
  if (/\bodi\b|one.?day/.test(text)) return 'odi';
  if (/\bt20\b|twenty|psl|ipl|bbl|cpl|hundred|super league/.test(text)) return 't20';
  return 'unknown';
}

function predictedFavorite(homeTeamId: string, awayTeamId: string, homeWinProb: number): string | null {
  if (homeWinProb === 0.5) return null;
  return homeWinProb > 0.5 ? homeTeamId : awayTeamId;
}

interface EvaluationRow {
  homeTeamId: string;
  awayTeamId: string;
  homeWinProb: number;
  confidence: number;
  actualWinnerId: string;
  format: string;
}

export interface PerformanceStats {
  sampleSize: number;
  accuracy: number | null;
  brierScore: number | null;
  expectedCalibrationError: number | null;
  byFormat: { format: string; sampleSize: number; accuracy: number; brierScore: number }[];
  byConfidenceBand: { band: string; sampleSize: number; accuracy: number; brierScore: number }[];
}

function computePerformanceStats(rows: EvaluationRow[], binCount = 10): PerformanceStats {
  const bins = Math.min(20, Math.max(5, binCount));
  const buckets = Array.from({ length: bins }, (_, index) => ({
    index,
    predictedTotal: 0,
    actualTotal: 0,
    sampleSize: 0,
  }));
  const byFormat = new Map<string, { sampleSize: number; correct: number; brier: number }>();
  const byConfidenceBand = new Map<string, { sampleSize: number; correct: number; brier: number }>();

  let correct = 0;
  let brierTotal = 0;

  for (const row of rows) {
    const favorite = predictedFavorite(row.homeTeamId, row.awayTeamId, row.homeWinProb);
    const hit = favorite === row.actualWinnerId;
    if (hit) correct += 1;
    const actual = row.actualWinnerId === row.homeTeamId ? 1 : 0;
    const rowBrier = (row.homeWinProb - actual) ** 2;
    brierTotal += rowBrier;

    const probability = Math.max(row.homeWinProb, 1 - row.homeWinProb);
    const bucket = buckets[Math.min(bins - 1, Math.floor(probability * bins))];
    bucket.predictedTotal += probability;
    bucket.actualTotal += hit ? 1 : 0;
    bucket.sampleSize += 1;

    const formatBucket = byFormat.get(row.format) ?? { sampleSize: 0, correct: 0, brier: 0 };
    formatBucket.sampleSize += 1;
    if (hit) formatBucket.correct += 1;
    formatBucket.brier += rowBrier;
    byFormat.set(row.format, formatBucket);

    const band = row.confidence >= 0.75 ? 'high' : row.confidence >= 0.5 ? 'medium' : 'low';
    const confidenceBucket = byConfidenceBand.get(band) ?? { sampleSize: 0, correct: 0, brier: 0 };
    confidenceBucket.sampleSize += 1;
    if (hit) confidenceBucket.correct += 1;
    confidenceBucket.brier += rowBrier;
    byConfidenceBand.set(band, confidenceBucket);
  }

  const sampleSize = rows.length;
  const populated = buckets
    .filter((bucket) => bucket.sampleSize > 0)
    .map((bucket) => {
      const meanPredicted = bucket.predictedTotal / bucket.sampleSize;
      const actualRate = bucket.actualTotal / bucket.sampleSize;
      return {
        bin: bucket.index,
        minProbability: Number((bucket.index / bins).toFixed(4)),
        maxProbability: Number(((bucket.index + 1) / bins).toFixed(4)),
        sampleSize: bucket.sampleSize,
        meanPredicted: Number(meanPredicted.toFixed(4)),
        actualRate: Number(actualRate.toFixed(4)),
        calibrationError: Number(Math.abs(meanPredicted - actualRate).toFixed(4)),
      };
    });

  const expectedCalibrationError =
    sampleSize === 0 || populated.length === 0
      ? null
      : Number(
          (
            populated.reduce(
              (sum, bucket) => sum + bucket.calibrationError * bucket.sampleSize,
              0,
            ) / sampleSize
          ).toFixed(4),
        );

  return {
    sampleSize,
    accuracy: sampleSize ? Number((correct / sampleSize).toFixed(4)) : null,
    brierScore: sampleSize ? Number((brierTotal / sampleSize).toFixed(4)) : null,
    expectedCalibrationError,
    byFormat: [...byFormat.entries()].map(([format, value]) => ({
      format,
      sampleSize: value.sampleSize,
      accuracy: Number((value.correct / value.sampleSize).toFixed(4)),
      brierScore: Number((value.brier / value.sampleSize).toFixed(4)),
    })),
    byConfidenceBand: [...byConfidenceBand.entries()].map(([band, value]) => ({
      band,
      sampleSize: value.sampleSize,
      accuracy: Number((value.correct / value.sampleSize).toFixed(4)),
      brierScore: Number((value.brier / value.sampleSize).toFixed(4)),
    })),
  };
}

interface EvaluationQueryRow {
  matchId: string;
  tournament: string | null;
  matchStatus: string | null;
  homeWinProb: number;
  confidence: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  format: string | null;
}

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);
  /** TTL for the public performance summary; 0 disables caching. */
  private readonly performanceCacheTtlSeconds = Number(
    process.env.PREDICTION_PERFORMANCE_CACHE_TTL_SECONDS ?? 300,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly narratives: PredictionNarrativeService,
    private readonly redis: RedisService,
  ) {}

  private async presentRun(
    row: Parameters<typeof mapRun>[0] & { features?: { snapshot: unknown } | null },
    previousHomeWinProb?: number | null,
  ): Promise<PredictionRunView | null> {
    const view = mapRun(row);
    if (!view) return null;
    const snapshot = (row.features?.snapshot ?? null) as Record<string, unknown> | null;
    const copy = await this.narratives.forStoredRun(view.runId, {
      stage: view.stage,
      homeWinProb: view.homeWinProb,
      awayWinProb: view.awayWinProb,
      confidence: view.confidence,
      calibrationBand: view.calibrationBand,
      explanation: view.explanation,
      scoreRange: view.scoreRange,
      snapshot,
      previousHomeWinProb,
    });
    return { ...view, narrative: copy.text, narrativeSource: copy.source };
  }

  private async latestByStage(matchId: string, stage: string): Promise<PredictionRunView | null> {
    const row = await this.prisma.predictionRun.findFirst({
      where: { matchId, stage },
      orderBy: { createdAt: 'desc' },
      include: { result: true, features: true },
    });
    return row ? this.presentRun(row) : null;
  }

  async getLatest(matchId: string) {
    const [preMatch, live] = await Promise.all([
      this.latestByStage(matchId, 'pre_match'),
      this.latestByStage(matchId, 'live'),
    ]);
    if (!preMatch && !live) {
      throw new NotFoundException(`No predictions found for ${matchId}`);
    }
    return { matchId, preMatch, live };
  }

  async getBulk(matchIds: string[]) {
    const uniqueMatchIds = [...new Set(matchIds)];
    if (uniqueMatchIds.length === 0) {
      return { data: {}, meta: { requested: 0, returned: 0, missing: 0 } };
    }

    const latest = await this.prisma.$queryRaw<
      Array<{ id: string; matchId: string; stage: string }>
    >(Prisma.sql`
      SELECT DISTINCT ON (match_id, stage)
        id,
        match_id AS "matchId",
        stage
      FROM prediction_runs
      WHERE match_id IN (${Prisma.join(uniqueMatchIds)})
        AND stage IN ('pre_match', 'live')
      ORDER BY match_id, stage, created_at DESC, id DESC
    `);
    const rows = latest.length
      ? await this.prisma.predictionRun.findMany({
          where: { id: { in: latest.map((run) => run.id) } },
          include: { result: true, features: true, narrative: true },
        })
      : [];
    const presented = await Promise.all(
      rows.map(async (row) => {
        const view = mapRun(row);
        if (!view) return null;
        if (row.narrative) {
          return {
            ...view,
            narrative: row.narrative.text,
            narrativeSource: row.narrative.source,
          };
        }
        return this.presentRun(row);
      }),
    );
    const byMatch = new Map<
      string,
      { matchId: string; preMatch: PredictionRunView | null; live: PredictionRunView | null }
    >();
    for (const view of presented) {
      if (!view?.matchId) continue;
      const current = byMatch.get(view.matchId) ?? {
        matchId: view.matchId,
        preMatch: null,
        live: null,
      };
      if (view.stage === 'pre_match') current.preMatch = view;
      if (view.stage === 'live') current.live = view;
      byMatch.set(view.matchId, current);
    }

    const data = Object.fromEntries(
      uniqueMatchIds.map((matchId) => [
        matchId,
        byMatch.get(matchId) ?? { matchId, preMatch: null, live: null },
      ]),
    );
    const returned = [...byMatch.values()].filter(
      (prediction) => prediction.preMatch !== null || prediction.live !== null,
    ).length;
    return {
      data,
      meta: {
        requested: uniqueMatchIds.length,
        returned,
        missing: uniqueMatchIds.length - returned,
      },
    };
  }

  async getHistory(matchId: string) {
    const rows = await this.prisma.predictionRun.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      include: { result: true, features: true },
    });
    const runs: PredictionRunView[] = [];
    let previousLiveHome: number | null = null;
    for (const row of rows) {
      const view = await this.presentRun(row, row.stage === 'live' ? previousLiveHome : null);
      if (!view) continue;
      runs.push(view);
      if (row.stage === 'live' && row.result) previousLiveHome = row.result.homeWinProb;
    }
    return { matchId, runs };
  }

  async getChart(matchId: string) {
    const rows = await this.prisma.predictionRun.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      include: { result: true },
    });
    return {
      matchId,
      points: rows
        .filter((row) => row.result !== null)
        .map((row) => {
          const explanation = (row.result!.explanation ?? {}) as Record<string, unknown>;
          return {
            runId: row.id,
            stage: row.stage,
            modelVersion: row.modelVersion,
            createdAt: row.createdAt,
            over: typeof explanation.over === 'number' ? explanation.over : null,
            homeWinProb: row.result!.homeWinProb,
            awayWinProb: row.result!.awayWinProb,
            momentum: row.result!.momentum,
            pressureIndex: row.result!.pressureIndex,
            reasons: Array.isArray(explanation.reasons) ? explanation.reasons : [],
          };
        }),
    };
  }

  /**
   * Latest qualifying run per completed match, scored against the stored result.
   * Two set-based queries instead of two queries per completed match: the old loop made
   * ~2k round trips (one an unindexed sport_event_records lookup) and took 5-15s.
   */
  private async evaluationRows(modelVersion?: string, stage = 'pre_match'): Promise<EvaluationRow[]> {
    const modelFilter = modelVersion ? Prisma.sql`AND pr.model_version = ${modelVersion}` : Prisma.empty;
    // Live runs taken after the match was decided would inflate accuracy, so the latest
    // run *before* that point is scored instead.
    const liveFilter =
      stage === 'live'
        ? Prisma.sql`AND EXISTS (
            SELECT 1 FROM prediction_results r
            WHERE r.run_id = pr.id
              AND NOT COALESCE(r.explanation -> 'reasons' @> '["match_decided"]'::jsonb, false)
          )`
        : Prisma.empty;
    const latestRuns = await this.prisma.$queryRaw<EvaluationQueryRow[]>`
      WITH latest AS (
        SELECT DISTINCT ON (pr.match_id) pr.id, pr.match_id, m.tournament, m.match_status
        FROM prediction_runs pr
        JOIN matches m ON m.match_id = pr.match_id AND m.status = 'completed'
        WHERE pr.stage = ${stage} ${modelFilter} ${liveFilter}
        ORDER BY pr.match_id, pr.created_at DESC
      )
      SELECT latest.match_id AS "matchId",
             latest.tournament,
             latest.match_status AS "matchStatus",
             res.home_win_prob AS "homeWinProb",
             res.confidence,
             f.snapshot ->> 'homeTeamId' AS "homeTeamId",
             f.snapshot ->> 'awayTeamId' AS "awayTeamId",
             f.snapshot ->> 'format' AS format
      FROM latest
      JOIN prediction_results res ON res.run_id = latest.id
      LEFT JOIN prediction_features f ON f.run_id = latest.id
      ORDER BY latest.match_id
    `;
    if (latestRuns.length === 0) return [];

    const matchIds = latestRuns.map((row) => row.matchId);
    const events = await this.prisma.$queryRaw<{ eventId: string; payload: unknown }[]>`
      SELECT DISTINCT ON (event_id) event_id AS "eventId", payload
      FROM sport_event_records
      WHERE event_id = ANY(${matchIds}::text[])
      ORDER BY event_id, updated_at DESC
    `;
    const payloadByMatch = new Map(events.map((event) => [event.eventId, event.payload]));

    const rows: EvaluationRow[] = [];
    for (const run of latestRuns) {
      const homeTeamId = run.homeTeamId ?? '';
      const awayTeamId = run.awayTeamId ?? '';
      const actualWinnerId = extractWinnerId(
        payloadByMatch.get(run.matchId),
        [homeTeamId, awayTeamId].filter(Boolean),
      );
      if (!actualWinnerId || !homeTeamId || !awayTeamId) continue;
      rows.push({
        homeTeamId,
        awayTeamId,
        homeWinProb: run.homeWinProb,
        confidence: run.confidence,
        actualWinnerId,
        format: run.format ? run.format : detectFormat(run.tournament, run.matchStatus),
      });
    }
    return rows;
  }

  async getPerformance(query: { modelVersion?: string; stage?: string; bins?: number } = {}) {
    const stage = query.stage === 'live' ? 'live' : 'pre_match';
    const selectedModel =
      query.modelVersion ??
      (stage === 'live' ? PREDICTION_MODELS.LIVE : PREDICTION_MODELS.PREMATCH);
    const binCount = Number(query.bins) || 10;
    const cacheKey = `predictions:performance:${stage}:${selectedModel}:${binCount}`;
    const cached = await this.performanceCacheGet<Awaited<ReturnType<PredictionsService['computePerformance']>>>(cacheKey);
    if (cached) return cached;
    const payload = await this.computePerformance(selectedModel, stage, binCount);
    await this.performanceCacheSet(cacheKey, payload);
    return payload;
  }

  private async computePerformance(selectedModel: string, stage: string, binCount: number) {
    const usable = await this.evaluationRows(selectedModel, stage);
    const stats = computePerformanceStats(usable, binCount);
    const publishMinSamples = Number(process.env.PREDICTION_PUBLISH_MIN_SAMPLES || 200);
    const claimReady = stats.sampleSize >= publishMinSamples;
    return {
      modelVersion: selectedModel,
      stage,
      ...stats,
      claimReady,
      publishMinSamples,
      guidance: claimReady
        ? 'Sample is large enough to quote accuracy carefully by format.'
        : `Do not market a headline accuracy % until sampleSize >= ${publishMinSamples} settled matches.`,
    };
  }

  private async performanceCacheGet<T>(key: string): Promise<T | null> {
    if (this.performanceCacheTtlSeconds <= 0) return null;
    try {
      return await this.redis.get<T>(key);
    } catch (err) {
      this.logger.warn(`performance cache read failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async performanceCacheSet(key: string, payload: unknown): Promise<void> {
    if (this.performanceCacheTtlSeconds <= 0) return;
    try {
      await this.redis.cached.set(key, JSON.stringify(payload), 'EX', this.performanceCacheTtlSeconds);
    } catch (err) {
      this.logger.warn(`performance cache write failed: ${(err as Error).message}`);
    }
  }

  async listPerformanceHistory(query: { modelVersion?: string; stage?: string; limit?: number }) {
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 30));
    const rows = await this.prisma.predictionPerformanceSnapshot.findMany({
      where: {
        ...(query.modelVersion ? { modelVersion: query.modelVersion } : {}),
        ...(query.stage ? { stage: query.stage } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      data: rows.map((row) => ({
        id: row.id,
        modelVersion: row.modelVersion,
        stage: row.stage,
        sampleSize: row.sampleSize,
        accuracy: row.accuracy,
        brierScore: row.brierScore,
        expectedCalibrationError: row.expectedCalibrationError,
        byFormat: row.byFormat,
        byConfidenceBand: row.byConfidenceBand,
        source: row.source,
        createdAt: row.createdAt,
      })),
      meta: { limit },
    };
  }

  async recordPerformanceSnapshot(query: {
    modelVersion?: string;
    stage?: string;
    source?: string;
    bins?: number;
  }) {
    const stage = query.stage === 'live' ? 'live' : 'pre_match';
    const selectedModel =
      query.modelVersion ??
      (stage === 'live' ? PREDICTION_MODELS.LIVE : PREDICTION_MODELS.PREMATCH);
    const usable = await this.evaluationRows(selectedModel, stage);
    if (usable.length === 0) {
      throw new NotFoundException(`No evaluable matches found for ${selectedModel} (${stage})`);
    }
    const stats = computePerformanceStats(usable, Number(query.bins) || 10);
    return this.prisma.predictionPerformanceSnapshot.create({
      data: {
        modelVersion: selectedModel,
        stage,
        sampleSize: stats.sampleSize,
        accuracy: stats.accuracy,
        brierScore: stats.brierScore,
        expectedCalibrationError: stats.expectedCalibrationError,
        byFormat: stats.byFormat as unknown as Prisma.InputJsonValue,
        byConfidenceBand: stats.byConfidenceBand as unknown as Prisma.InputJsonValue,
        source: query.source ?? 'manual',
      },
    });
  }

  async listModelWeights() {
    const rows = await this.prisma.predictionModelWeight.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const latestPerKey = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = `${row.modelVersion}|${row.stage}|${row.format}`;
      if (!latestPerKey.has(key)) latestPerKey.set(key, row);
    }
    return [...latestPerKey.values()].map((row) => ({
      id: row.id,
      modelVersion: row.modelVersion,
      stage: row.stage,
      format: row.format,
      weights: row.weights,
      intercept: row.intercept,
      sampleSize: row.sampleSize,
      brierScore: row.brierScore,
      accuracy: row.accuracy,
      source: row.source,
      createdAt: row.createdAt,
    }));
  }

  async listModelVersions() {
    const groups = await this.prisma.predictionRun.groupBy({
      by: ['modelVersion', 'stage'],
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: { modelVersion: 'asc' },
    });
    return groups.map((group) => ({
      modelVersion: group.modelVersion,
      stage: group.stage,
      runCount: group._count._all,
      firstRunAt: group._min.createdAt,
      lastRunAt: group._max.createdAt,
      isCurrent:
        (group.stage === 'pre_match' && group.modelVersion === PREDICTION_MODELS.PREMATCH) ||
        (group.stage === 'live' && group.modelVersion === PREDICTION_MODELS.LIVE),
    }));
  }

  async getRun(runId: string) {
    const row = await this.prisma.predictionRun.findUnique({
      where: { id: runId },
      include: { result: true, features: true },
    });
    if (!row?.result) throw new NotFoundException(`Prediction run ${runId} not found`);
    const view = await this.presentRun(row);
    if (!view) throw new NotFoundException(`Prediction run ${runId} not found`);
    return {
      ...view,
      features: row.features?.snapshot ?? null,
    };
  }

  async getCalibration(modelVersion?: string, binCount = 10, stage?: string) {
    const bins = Math.min(20, Math.max(5, Number(binCount) || 10));
    const selectedStage = stage === 'live' ? 'live' : 'pre_match';
    const selectedModel =
      modelVersion ??
      (selectedStage === 'live' ? PREDICTION_MODELS.LIVE : PREDICTION_MODELS.PREMATCH);
    const rows = await this.evaluationRows(selectedModel, selectedStage);
    const buckets = Array.from({ length: bins }, (_, index) => ({
      index,
      predictedTotal: 0,
      actualTotal: 0,
      sampleSize: 0,
    }));
    for (const row of rows) {
      const homeFavorite = row.homeWinProb >= 0.5;
      const probability = Math.max(row.homeWinProb, 1 - row.homeWinProb);
      const actual =
        (homeFavorite && row.actualWinnerId === row.homeTeamId) ||
        (!homeFavorite && row.actualWinnerId === row.awayTeamId)
          ? 1
          : 0;
      const index = Math.min(bins - 1, Math.floor(probability * bins));
      const bucket = buckets[index];
      bucket.predictedTotal += probability;
      bucket.actualTotal += actual;
      bucket.sampleSize += 1;
    }
    const populated = buckets
      .filter((bucket) => bucket.sampleSize > 0)
      .map((bucket) => {
        const meanPredicted = bucket.predictedTotal / bucket.sampleSize;
        const actualRate = bucket.actualTotal / bucket.sampleSize;
        return {
          bin: bucket.index,
          minProbability: Number((bucket.index / bins).toFixed(4)),
          maxProbability: Number(((bucket.index + 1) / bins).toFixed(4)),
          sampleSize: bucket.sampleSize,
          meanPredicted: Number(meanPredicted.toFixed(4)),
          actualRate: Number(actualRate.toFixed(4)),
          calibrationError: Number(Math.abs(meanPredicted - actualRate).toFixed(4)),
        };
      });
    const expectedCalibrationError =
      rows.length === 0
        ? null
        : Number(
            (
              populated.reduce(
                (sum, bucket) => sum + bucket.calibrationError * bucket.sampleSize,
                0,
              ) / rows.length
            ).toFixed(4),
          );
    const latestFit = await this.prisma.predictionCalibration.findFirst({
      where: { modelVersion: selectedModel },
      orderBy: { createdAt: 'desc' },
    });
    return {
      modelVersion: selectedModel,
      stage: selectedStage,
      sampleSize: rows.length,
      expectedCalibrationError,
      bins: populated,
      latestFit: latestFit
        ? {
            slope: latestFit.slope,
            intercept: latestFit.intercept,
            sampleSize: latestFit.sampleSize,
            brierScore: latestFit.brierScore,
            accuracy: latestFit.accuracy,
            source: latestFit.source,
            createdAt: latestFit.createdAt,
          }
        : null,
    };
  }

  async listRuns(query: {
    page?: number;
    limit?: number;
    matchId?: string;
    stage?: string;
    modelVersion?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const where = {
      ...(query.matchId ? { matchId: query.matchId } : {}),
      ...(query.stage ? { stage: query.stage } : {}),
      ...(query.modelVersion ? { modelVersion: query.modelVersion } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.predictionRun.findMany({
        where,
        include: { result: true, features: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.predictionRun.count({ where }),
    ]);
    const data = (
      await Promise.all(rows.map((row) => this.presentRun(row)))
    ).filter((row): row is PredictionRunView => row !== null);
    return {
      data,
      meta: { page, limit, totalRecords: total, totalPages: Math.ceil(total / limit) },
    };
  }
}
