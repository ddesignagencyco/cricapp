import { Injectable, NotFoundException } from '@nestjs/common';
import { PREDICTION_MODELS } from '@cricapp/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';

export interface PredictionRunView {
  runId: string;
  stage: string;
  modelVersion: string;
  createdAt: Date;
  homeWinProb: number;
  awayWinProb: number;
  confidence: number;
  explanation: Record<string, unknown>;
}

function mapRun(row: {
  id: string;
  stage: string;
  modelVersion: string;
  createdAt: Date;
  result: {
    homeWinProb: number;
    awayWinProb: number;
    confidence: number;
    explanation: unknown;
  } | null;
}): PredictionRunView | null {
  if (!row.result) return null;
  return {
    runId: row.id,
    stage: row.stage,
    modelVersion: row.modelVersion,
    createdAt: row.createdAt,
    homeWinProb: row.result.homeWinProb,
    awayWinProb: row.result.awayWinProb,
    confidence: row.result.confidence,
    explanation: (row.result.explanation ?? {}) as Record<string, unknown>,
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

  async getPerformance() {
    const completed = await this.prisma.match.findMany({
      where: { status: 'completed' },
      select: { matchId: true, tournament: true, matchStatus: true },
    });

    const rows: Array<{
      homeTeamId: string;
      awayTeamId: string;
      homeWinProb: number;
      actualWinnerId: string | null;
      format: string;
    }> = [];

    for (const match of completed) {
      const latest = await this.prisma.predictionRun.findFirst({
        where: { matchId: match.matchId, stage: 'pre_match' },
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
      rows.push({
        homeTeamId,
        awayTeamId,
        homeWinProb: latest.result.homeWinProb,
        actualWinnerId,
        format: detectFormat(match.tournament, match.matchStatus),
      });
    }

    const usable = rows.filter((r) => r.actualWinnerId && r.homeTeamId && r.awayTeamId);
    let correct = 0;
    let brier = 0;
    const byFormat = new Map<string, { sampleSize: number; correct: number }>();

    for (const row of usable) {
      const favorite = predictedFavorite(row.homeTeamId, row.awayTeamId, row.homeWinProb);
      const hit = favorite === row.actualWinnerId;
      if (hit) correct += 1;
      const actual = row.actualWinnerId === row.homeTeamId ? 1 : 0;
      brier += (row.homeWinProb - actual) ** 2;
      const bucket = byFormat.get(row.format) ?? { sampleSize: 0, correct: 0 };
      bucket.sampleSize += 1;
      if (hit) bucket.correct += 1;
      byFormat.set(row.format, bucket);
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
      })),
    };
  }
}
