import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import {
  bookmakerMarginFromDecimals,
  formatOddsFromDecimal,
  parseOddsToDecimal,
  percentOddsMovement,
} from './odds-math.util.js';

const ODDS_LICENSED = 'licensed';
const MATCH_WINNER_MARKET = 'match_winner';
import { redisKeys } from '@cricapp/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { PredictionsService } from '../predictions/predictions.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  buildOddsCompliance,
  oddsAccessBlocked,
  type OddsComplianceEnvelope,
} from './odds-compliance.util.js';
import type { OddsHistoryQuery } from './dto/odds.dto.js';

interface LatestRow {
  marketId: string;
  matchId: string;
  marketKey: string;
  marketType: string;
  name: string;
  sourceSlug: string;
  sourceName: string;
  selectionKey: string;
  decimalPrice: number;
  capturedAt: Date;
  receivedAt: Date;
}

type LatestPred = Awaited<ReturnType<PredictionsService['getLatest']>> | null;

interface MatchOddsPayload {
  matchId: string;
  compliance: OddsComplianceEnvelope;
  markets: unknown[];
  modelVsMarket: {
    homeWinProb: number | null;
    awayWinProb: number | null;
    marketHomeImplied: number | null;
    marketAwayImplied: number | null;
    note: string;
  };
  unavailable: string | null;
}

const MODEL_VS_MARKET_NOTE =
  'Model probabilities are analytical only and may differ from market-implied prices.';

@Injectable()
export class OddsService {
  private readonly logger = new Logger(OddsService.name);
  private readonly staleMinutes: number;
  private readonly cacheTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
    private readonly predictionsService: PredictionsService,
    private readonly redis: RedisService,
  ) {
    this.staleMinutes = Number(this.cfg.get('ODDS_STALE_MINUTES', 30));
    this.cacheTtlSeconds = Number(this.cfg.get('ODDS_CACHE_TTL_SECONDS', 60));
  }

  compliance(region?: string | null): OddsComplianceEnvelope {
    return buildOddsCompliance(this.cfg, region);
  }

  assertPublicOddsAccess(region?: string | null): OddsComplianceEnvelope {
    const compliance = this.compliance(region);
    if (oddsAccessBlocked(compliance)) {
      throw new ForbiddenException({
        message: 'Odds comparison is not available in this region or environment.',
        compliance,
      });
    }
    return compliance;
  }

  async getMatchOdds(matchId: string, region?: string | null) {
    const compliance = this.assertPublicOddsAccess(region);

    const cacheKey = redisKeys.oddsMatch(matchId);
    const cached = await this.cacheGet<MatchOddsPayload>(cacheKey);
    if (cached) return { ...cached, compliance };

    const match = await this.prisma.match.findUnique({ where: { matchId } });
    if (!match) throw new NotFoundException(`Match ${matchId} not found`);

    // Start the prediction lookup in parallel with the odds aggregation.
    const predPromise: Promise<LatestPred> = this.predictionsService
      .getLatest(matchId)
      .catch(() => null);

    const latest = await this.loadLatestLicensedPrices(matchId);
    if (latest.length === 0) {
      const payload = {
        matchId,
        compliance,
        markets: [],
        modelVsMarket: this.buildModelVsMarket(await predPromise, null, null),
        unavailable: 'No licensed odds snapshots are stored for this match yet.',
      };
      await this.cacheSet(cacheKey, payload);
      return payload;
    }

    const openingByKey = await this.loadOpeningPrices(latest);
    const markets = this.buildMarketComparisons(latest, match.teamNames as string[], openingByKey);
    const winner = markets.find((m) => m.marketKey === MATCH_WINNER_MARKET);
    const homeImplied = winner?.selections.find((s) => s.selectionKey === 'home')?.current
      .impliedProbability;
    const awayImplied = winner?.selections.find((s) => s.selectionKey === 'away')?.current
      .impliedProbability;

    const payload = {
      matchId,
      compliance,
      markets,
      modelVsMarket: this.buildModelVsMarket(
        await predPromise,
        homeImplied ?? null,
        awayImplied ?? null,
      ),
      unavailable: null,
    };
    await this.cacheSet(cacheKey, payload);
    return payload;
  }

  async getHistory(matchId: string, query: OddsHistoryQuery, region?: string | null) {
    this.assertPublicOddsAccess(region);
    const marketKey = query.marketKey ?? MATCH_WINNER_MARKET;
    const limit = query.limit ?? 500;

    const markets = await this.prisma.oddsMarket.findMany({
      where: { matchId, marketKey },
      include: { source: true },
    });
    if (markets.length === 0) {
      throw new NotFoundException(`No odds markets for match ${matchId} and key ${marketKey}`);
    }

    const sourceSlugByMarketId = new Map(markets.map((m) => [m.id, m.source.slug]));
    // Take the newest `limit` snapshots, then present them oldest-first for charts.
    const snapshots = await this.prisma.oddsSnapshot.findMany({
      where: {
        marketId: { in: markets.map((m) => m.id) },
        ...(query.selectionKey ? { selectionKey: query.selectionKey } : {}),
      },
      orderBy: { capturedAt: 'desc' },
      take: limit,
      select: {
        marketId: true,
        selectionKey: true,
        decimalPrice: true,
        capturedAt: true,
      },
    });
    snapshots.reverse();

    return {
      matchId,
      marketKey,
      points: snapshots.map((s) => ({
        capturedAt: s.capturedAt,
        decimalPrice: s.decimalPrice,
        sourceSlug: sourceSlugByMarketId.get(s.marketId) ?? '',
        selectionKey: s.selectionKey,
      })),
    };
  }

  convertOdds(from: 'decimal' | 'fractional' | 'american', value: string) {
    const parsed =
      from === 'decimal' || from === 'american'
        ? parseOddsToDecimal(Number(value), from)
        : parseOddsToDecimal(value, from);
    if (parsed === null) {
      throw new BadRequestException('Invalid odds value for the requested format');
    }
    return {
      decimal: parsed,
      formats: formatOddsFromDecimal(parsed),
      bookmakerMargin: null,
    };
  }

  marginFromDecimals(decimals: number[]) {
    return { margin: bookmakerMarginFromDecimals(decimals) };
  }

  async adminSourceHealth() {
    const staleCutoff = new Date(Date.now() - this.staleMinutes * 60 * 1000);

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        name: string;
        licenseStatus: string;
        isActive: boolean;
        lastCapturedAt: Date | null;
      }>
    >`
      SELECT
        src.id,
        src.slug,
        src.name,
        src.license_status AS "licenseStatus",
        src.is_active AS "isActive",
        MAX(s.captured_at) AS "lastCapturedAt"
      FROM odds_sources src
      LEFT JOIN odds_markets m ON m.source_id = src.id
      LEFT JOIN odds_snapshots s ON s.market_id = m.id
      GROUP BY src.id
      ORDER BY src.name ASC
    `;

    return {
      staleAfterMinutes: this.staleMinutes,
      sources: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        licenseStatus: row.licenseStatus,
        isActive: row.isActive,
        lastCapturedAt: row.lastCapturedAt ?? null,
        stale: !row.lastCapturedAt || row.lastCapturedAt < staleCutoff,
      })),
    };
  }

  /** Latest licensed snapshot per market + selection in a single query. */
  private async loadLatestLicensedPrices(matchId: string): Promise<LatestRow[]> {
    return this.prisma.$queryRaw<LatestRow[]>`
      SELECT DISTINCT ON (s.market_id, s.selection_key)
        s.market_id AS "marketId",
        m.match_id AS "matchId",
        m.market_key AS "marketKey",
        m.market_type AS "marketType",
        m.name,
        src.slug AS "sourceSlug",
        src.name AS "sourceName",
        s.selection_key AS "selectionKey",
        s.decimal_price AS "decimalPrice",
        s.captured_at AS "capturedAt",
        s.received_at AS "receivedAt"
      FROM odds_snapshots s
      JOIN odds_markets m ON m.id = s.market_id
      JOIN odds_sources src ON src.id = m.source_id
      WHERE m.match_id = ${matchId}
        AND src.license_status = ${ODDS_LICENSED}
        AND src.is_active = true
      ORDER BY s.market_id, s.selection_key, s.captured_at DESC
    `;
  }

  /** Earliest snapshot (opening price) per market + selection in a single query. */
  private async loadOpeningPrices(latest: LatestRow[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const marketIds = [...new Set(latest.map((r) => r.marketId))];
    if (marketIds.length === 0) return map;

    const rows = await this.prisma.$queryRaw<
      Array<{ marketId: string; selectionKey: string; decimalPrice: number }>
    >`
      SELECT DISTINCT ON (market_id, selection_key)
        market_id AS "marketId",
        selection_key AS "selectionKey",
        decimal_price AS "decimalPrice"
      FROM odds_snapshots
      WHERE market_id IN (${Prisma.join(marketIds)})
      ORDER BY market_id, selection_key, captured_at ASC
    `;
    for (const row of rows) {
      map.set(`${row.marketId}:${row.selectionKey}`, row.decimalPrice);
    }
    return map;
  }

  private buildMarketComparisons(
    latest: LatestRow[],
    teamNames: string[],
    openingByKey: Map<string, number>,
  ) {
    const byMarket = new Map<string, LatestRow[]>();
    for (const row of latest) {
      const list = byMarket.get(row.marketKey) ?? [];
      list.push(row);
      byMarket.set(row.marketKey, list);
    }

    const homeLabel = teamNames?.[0] ?? 'Home';
    const awayLabel = teamNames?.[1] ?? 'Away';

    return [...byMarket.entries()].map(([marketKey, rows]) => {
      const sample = rows[0];
      const selectionKeys = [...new Set(rows.map((r) => r.selectionKey))];

      const selections = selectionKeys.map((selectionKey) => {
        const offers = rows.filter((r) => r.selectionKey === selectionKey);
        const best = offers.reduce((a, b) => (b.decimalPrice > a.decimalPrice ? b : a));
        return { selectionKey, best, offers };
      });

      const bestDecimals = selections.map((s) => s.best.decimalPrice);
      const margin = bookmakerMarginFromDecimals(bestDecimals);

      const flatSelections = selections.flatMap(({ selectionKey, best, offers }) =>
        offers.map((row) => {
          const opening = openingByKey.get(`${row.marketId}:${selectionKey}`) ?? null;
          return {
            selectionKey,
            label: selectionKey === 'home' ? homeLabel : selectionKey === 'away' ? awayLabel : selectionKey,
            current: formatOddsFromDecimal(row.decimalPrice),
            opening: opening !== null ? formatOddsFromDecimal(opening) : null,
            movementPercent:
              opening !== null ? percentOddsMovement(opening, row.decimalPrice) : null,
            sourceSlug: row.sourceSlug,
            sourceName: row.sourceName,
            capturedAt: row.capturedAt,
            receivedAt: row.receivedAt,
            isBestDisplayedPrice:
              row.decimalPrice === best.decimalPrice && row.sourceSlug === best.sourceSlug,
          };
        }),
      );

      return {
        marketKey,
        marketType: sample.marketType,
        name: sample.name,
        bookmakerMargin: margin,
        selections: flatSelections,
      };
    });
  }

  private buildModelVsMarket(
    pred: LatestPred,
    marketHomeImplied: number | null,
    marketAwayImplied: number | null,
  ) {
    return {
      homeWinProb: pred?.preMatch?.homeWinProb ?? pred?.live?.homeWinProb ?? null,
      awayWinProb: pred?.preMatch?.awayWinProb ?? pred?.live?.awayWinProb ?? null,
      marketHomeImplied,
      marketAwayImplied,
      note: MODEL_VS_MARKET_NOTE,
    };
  }

  private async cacheGet<T>(key: string): Promise<T | null> {
    if (this.cacheTtlSeconds <= 0) return null;
    try {
      return await this.redis.get<T>(key);
    } catch (err) {
      this.logger.warn(`odds cache read failed: ${(err as Error).message}`);
      return null;
    }
  }

  private async cacheSet(key: string, payload: unknown): Promise<void> {
    if (this.cacheTtlSeconds <= 0) return;
    try {
      await this.redis.cached.set(key, JSON.stringify(payload), 'EX', this.cacheTtlSeconds);
    } catch (err) {
      this.logger.warn(`odds cache write failed: ${(err as Error).message}`);
    }
  }
}
