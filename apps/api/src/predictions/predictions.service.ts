import { Injectable, NotFoundException } from '@nestjs/common';
import { PREDICTION_MODELS } from '@cricapp/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';

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

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async latestByStage(matchId: string, stage: string): Promise<PredictionRunView | null> {
    const row = await this.prisma.predictionRun.findFirst({
      where: { matchId, stage },
      orderBy: { createdAt: 'desc' },
      include: { result: true },
    });
    return row ? mapRun(row) : null;
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

  async getHistory(matchId: string) {
    const rows = await this.prisma.predictionRun.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      include: { result: true },
    });
    return {
      matchId,
      runs: rows.map((row) => mapRun(row)).filter((x): x is PredictionRunView => x !== null),
    };
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

  private async evaluationRows(modelVersion?: string): Promise<EvaluationRow[]> {
    const completed = await this.prisma.match.findMany({
      where: { status: 'completed' },
      select: { matchId: true, tournament: true, matchStatus: true },
    });

    const rows: EvaluationRow[] = [];

    for (const match of completed) {
      const latest = await this.prisma.predictionRun.findFirst({
        where: {
          matchId: match.matchId,
          stage: 'pre_match',
          ...(modelVersion ? { modelVersion } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: { result: true, features: true },
      });
      if (!latest?.result) continue;

      const snapshot = (latest.features?.snapshot ?? {}) as Record<string, unknown>;
      const homeTeamId = String(snapshot.homeTeamId ?? '');
      const awayTeamId = String(snapshot.awayTeamId ?? '');
      const event = await this.prisma.sportEventRecord.findFirst({
        where: { eventId: match.matchId },
        orderBy: { updatedAt: 'desc' },
      });
      const actualWinnerId = extractWinnerId(event?.payload, [homeTeamId, awayTeamId].filter(Boolean));
      if (!actualWinnerId || !homeTeamId || !awayTeamId) continue;
      rows.push({
        homeTeamId,
        awayTeamId,
        homeWinProb: latest.result.homeWinProb,
        confidence: latest.result.confidence,
        actualWinnerId,
        format: detectFormat(match.tournament, match.matchStatus),
      });
    }
    return rows;
  }

  async getPerformance() {
    const usable = await this.evaluationRows(PREDICTION_MODELS.PREMATCH);
    let correct = 0;
    let brier = 0;
    const byFormat = new Map<string, { sampleSize: number; correct: number; brier: number }>();
    const byConfidenceBand = new Map<string, { sampleSize: number; correct: number; brier: number }>();

    for (const row of usable) {
      const favorite = predictedFavorite(row.homeTeamId, row.awayTeamId, row.homeWinProb);
      const hit = favorite === row.actualWinnerId;
      if (hit) correct += 1;
      const actual = row.actualWinnerId === row.homeTeamId ? 1 : 0;
      const rowBrier = (row.homeWinProb - actual) ** 2;
      brier += rowBrier;
      const bucket = byFormat.get(row.format) ?? { sampleSize: 0, correct: 0, brier: 0 };
      bucket.sampleSize += 1;
      if (hit) bucket.correct += 1;
      bucket.brier += rowBrier;
      byFormat.set(row.format, bucket);
      const confidenceBand =
        row.confidence >= 0.75 ? 'high' : row.confidence >= 0.5 ? 'medium' : 'low';
      const confidenceBucket = byConfidenceBand.get(confidenceBand) ?? {
        sampleSize: 0,
        correct: 0,
        brier: 0,
      };
      confidenceBucket.sampleSize += 1;
      if (hit) confidenceBucket.correct += 1;
      confidenceBucket.brier += rowBrier;
      byConfidenceBand.set(confidenceBand, confidenceBucket);
    }

    const sampleSize = usable.length;
    return {
      modelVersion: PREDICTION_MODELS.PREMATCH,
      sampleSize,
      accuracy: sampleSize ? Number((correct / sampleSize).toFixed(4)) : null,
      brierScore: sampleSize ? Number((brier / sampleSize).toFixed(4)) : null,
      byFormat: [...byFormat.entries()].map(([format, v]) => ({
        format,
        sampleSize: v.sampleSize,
        accuracy: Number((v.correct / v.sampleSize).toFixed(4)),
        brierScore: Number((v.brier / v.sampleSize).toFixed(4)),
      })),
      byConfidenceBand: [...byConfidenceBand.entries()].map(([band, v]) => ({
        band,
        sampleSize: v.sampleSize,
        accuracy: Number((v.correct / v.sampleSize).toFixed(4)),
        brierScore: Number((v.brier / v.sampleSize).toFixed(4)),
      })),
    };
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
    return {
      ...mapRun(row),
      features: row.features?.snapshot ?? null,
    };
  }

  async getCalibration(modelVersion?: string, binCount = 10) {
    const bins = Math.min(20, Math.max(5, Number(binCount) || 10));
    const selectedModel = modelVersion ?? PREDICTION_MODELS.PREMATCH;
    const rows = await this.evaluationRows(selectedModel);
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
        include: { result: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.predictionRun.count({ where }),
    ]);
    return {
      data: rows.map(mapRun).filter((row): row is PredictionRunView => row !== null),
      meta: { page, limit, totalRecords: total, totalPages: Math.ceil(total / limit) },
    };
  }
}
