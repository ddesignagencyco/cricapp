import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  bookmakerMarginFromDecimals,
  formatOddsFromDecimal,
  parseOddsToDecimal,
  percentOddsMovement,
} from './odds-math.util.js';

const ODDS_LICENSED = 'licensed';
const MATCH_WINNER_MARKET = 'match_winner';
import { PrismaService } from '../prisma/prisma.service.js';
import { PredictionsService } from '../predictions/predictions.service.js';
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

@Injectable()
export class OddsService {
  private readonly staleMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
    private readonly predictionsService: PredictionsService,
  ) {
    this.staleMinutes = Number(this.cfg.get('ODDS_STALE_MINUTES', 30));
  }

  compliance(): OddsComplianceEnvelope {
    return buildOddsCompliance(this.cfg);
  }

  assertPublicOddsAccess(): OddsComplianceEnvelope {
    const compliance = this.compliance();
    if (oddsAccessBlocked(compliance)) {
      throw new ForbiddenException({
        message: 'Odds comparison is not available in this region or environment.',
        compliance,
      });
    }
    return compliance;
  }

  async getMatchOdds(matchId: string) {
    const compliance = this.assertPublicOddsAccess();

    const match = await this.prisma.match.findUnique({ where: { matchId } });
    if (!match) throw new NotFoundException(`Match ${matchId} not found`);

    const latest = await this.loadLatestLicensedPrices(matchId);
    if (latest.length === 0) {
      return {
        matchId,
        compliance,
        markets: [],
        modelVsMarket: await this.buildModelVsMarket(matchId, null, null),
        unavailable: 'No licensed odds snapshots are stored for this match yet.',
      };
    }

    const openingByKey = await this.loadOpeningPrices(latest);
    const markets = this.buildMarketComparisons(latest, match.teamNames as string[], openingByKey);
    const winner = markets.find((m) => m.marketKey === MATCH_WINNER_MARKET);
    const homeImplied = winner?.selections.find((s) => s.selectionKey === 'home')?.current
      .impliedProbability;
    const awayImplied = winner?.selections.find((s) => s.selectionKey === 'away')?.current
      .impliedProbability;

    return {
      matchId,
      compliance,
      markets,
      modelVsMarket: await this.buildModelVsMarket(matchId, homeImplied ?? null, awayImplied ?? null),
      unavailable: null,
    };
  }

  async getHistory(matchId: string, query: OddsHistoryQuery) {
    this.assertPublicOddsAccess();
    const marketKey = query.marketKey ?? MATCH_WINNER_MARKET;
    const limit = query.limit ?? 500;

    const markets = await this.prisma.oddsMarket.findMany({
      where: { matchId, marketKey },
      include: { source: true },
    });
    if (markets.length === 0) {
      throw new NotFoundException(`No odds markets for match ${matchId} and key ${marketKey}`);
    }

    const marketIds = markets.map((m) => m.id);
    const snapshots = await this.prisma.oddsSnapshot.findMany({
      where: {
        marketId: { in: marketIds },
        ...(query.selectionKey ? { selectionKey: query.selectionKey } : {}),
      },
      orderBy: { capturedAt: 'asc' },
      take: limit,
      include: { market: { include: { source: true } } },
    });

    return {
      matchId,
      marketKey,
      points: snapshots.map((s) => ({
        capturedAt: s.capturedAt,
        decimalPrice: s.decimalPrice,
        sourceSlug: s.market.source.slug,
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
      throw new NotFoundException('Invalid odds value for the requested format');
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
    const sources = await this.prisma.oddsSource.findMany({ orderBy: { name: 'asc' } });
    const staleCutoff = new Date(Date.now() - this.staleMinutes * 60 * 1000);

    const rows = await Promise.all(
      sources.map(async (source) => {
        const latest = await this.prisma.oddsSnapshot.findFirst({
          where: { market: { sourceId: source.id } },
          orderBy: { capturedAt: 'desc' },
        });
        return {
          id: source.id,
          slug: source.slug,
          name: source.name,
          licenseStatus: source.licenseStatus,
          isActive: source.isActive,
          lastCapturedAt: latest?.capturedAt ?? null,
          stale: !latest || latest.capturedAt < staleCutoff,
        };
      }),
    );

    return {
      staleAfterMinutes: this.staleMinutes,
      sources: rows,
    };
  }

  private async loadLatestLicensedPrices(matchId: string): Promise<LatestRow[]> {
    const markets = await this.prisma.oddsMarket.findMany({
      where: {
        matchId,
        source: {
          licenseStatus: ODDS_LICENSED,
          isActive: true,
        },
      },
      include: { source: true },
    });

    const rows: LatestRow[] = [];
    for (const market of markets) {
      const selectionKeys = await this.prisma.oddsSnapshot.findMany({
        where: { marketId: market.id },
        distinct: ['selectionKey'],
        select: { selectionKey: true },
      });

      for (const { selectionKey } of selectionKeys) {
        const snap = await this.prisma.oddsSnapshot.findFirst({
          where: { marketId: market.id, selectionKey },
          orderBy: { capturedAt: 'desc' },
        });
        if (!snap) continue;
        rows.push({
          marketId: market.id,
          matchId: market.matchId,
          marketKey: market.marketKey,
          marketType: market.marketType,
          name: market.name,
          sourceSlug: market.source.slug,
          sourceName: market.source.name,
          selectionKey: snap.selectionKey,
          decimalPrice: snap.decimalPrice,
          capturedAt: snap.capturedAt,
          receivedAt: snap.receivedAt,
        });
      }
    }
    return rows;
  }

  private async loadOpeningPrices(latest: LatestRow[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const pairs = [...new Set(latest.map((r) => `${r.marketId}:${r.selectionKey}`))];
    await Promise.all(
      pairs.map(async (pair) => {
        const [marketId, selectionKey] = pair.split(':');
        const first = await this.prisma.oddsSnapshot.findFirst({
          where: { marketId, selectionKey },
          orderBy: { capturedAt: 'asc' },
        });
        if (first) map.set(pair, first.decimalPrice);
      }),
    );
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

  private async buildModelVsMarket(
    matchId: string,
    marketHomeImplied: number | null,
    marketAwayImplied: number | null,
  ) {
    try {
      const pred = await this.predictionsService.getLatest(matchId);
      const home = pred.preMatch?.homeWinProb ?? pred.live?.homeWinProb ?? null;
      const away = pred.preMatch?.awayWinProb ?? pred.live?.awayWinProb ?? null;
      return {
        homeWinProb: home,
        awayWinProb: away,
        marketHomeImplied,
        marketAwayImplied,
        note: 'Model probabilities are analytical only and may differ from market-implied prices.',
      };
    } catch {
      return {
        homeWinProb: null,
        awayWinProb: null,
        marketHomeImplied,
        marketAwayImplied,
        note: 'Model probabilities are analytical only and may differ from market-implied prices.',
      };
    }
  }
}
