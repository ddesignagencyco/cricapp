'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import EmptyState from '../EmptyState';
import { Skeleton } from '../skeletons/Skeletons';
import OddsHistoryChart from './OddsHistoryChart';
import OddsMarketRulesDisclosure from './OddsMarketRulesDisclosure';
import {
  formatMovementPercent,
  formatOddsPrice,
  formatOddsUtc,
  formatPayoutPercent,
  groupSelectionsByKey,
  impliedPercent,
  isOddsCaptureStale,
  isOddsSeedSource,
  modelPercent,
  readOddsAgeConsent,
  storeOddsAgeConsent,
} from '../../lib/oddsDisplay';
import { isHiddenSelection, marketLabel, partitionMarkets, selectionLabel } from '../../lib/oddsMarketLabels';
import { fetchMatchOdds, fetchOddsHistory } from '../../services/odds';
import type {
  MatchOddsResponse,
  ModelPredictionStage,
  OddsHistoryPoint,
  OddsPriceFormat,
  OddsSelectionPrice,
} from '../../types/odds';

interface Props {
  matchId: string;
  homeLabel: string;
  awayLabel: string;
  initial?: MatchOddsResponse | null;
  initialForbidden?: boolean;
  pollLive?: boolean;
  compact?: boolean;
}

export default function MatchOddsView({
  matchId,
  homeLabel,
  awayLabel,
  initial = null,
  initialForbidden = false,
  pollLive = false,
  compact = false,
}: Props) {
  const [data, setData] = useState<MatchOddsResponse | null>(initial);
  const [forbidden, setForbidden] = useState(initialForbidden);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(!initial && !initialForbidden);
  const [priceFormat, setPriceFormat] = useState<OddsPriceFormat>('decimal');
  const [activeMarketKey, setActiveMarketKey] = useState('');
  // The chart always follows the first column now, so there is nothing to switch.
  const [historyPoints, setHistoryPoints] = useState<OddsHistoryPoint[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ageOk, setAgeOk] = useState(false);

  const refresh = useCallback(async () => {
    const result = await fetchMatchOdds(matchId, { revalidate: false });
    if (result.status === 'forbidden') {
      setForbidden(true);
      setData(null);
      return;
    }
    if (result.status === 'not_found') {
      setNotFound(true);
      setData(null);
      return;
    }
    setForbidden(false);
    setNotFound(false);
    setData(result.data);
  }, [matchId]);

  useEffect(() => {
    setAgeOk(readOddsAgeConsent());
  }, []);

  useEffect(() => {
    if (initial || initialForbidden) return;
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initial, initialForbidden, refresh]);

  useEffect(() => {
    if (!pollLive || forbidden || !data?.markets.length) return;
    const id = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, 45_000);
    return () => window.clearInterval(id);
  }, [pollLive, forbidden, data?.markets.length, refresh]);

  // The feed sends whatever wording its source used, so the tab row is built from a
  // plain-English shortlist instead: the markets a reader recognises come first, in a
  // fixed order, and anything else is folded into a "More markets" disclosure rather
  // than sitting beside them as noise.
  const { common: commonMarkets, more: extraMarkets } = useMemo(
    () => partitionMarkets(data?.markets ?? []),
    [data],
  );
  const availableMarkets = useMemo(
    () => [...commonMarkets, ...extraMarkets],
    [commonMarkets, extraMarkets],
  );
  const activeMarket = availableMarkets.find((market) => market.marketKey === activeMarketKey)
    ?? availableMarkets.find((market) => market.marketKey === 'match_winner')
    ?? commonMarkets[0]
    ?? availableMarkets[0]
    ?? null;
  // A market is only "example prices" when EVERY row is seed data. If any real
  // bookmaker is present the seed rows are dropped entirely: leaving them in
  // would let a fake price sit in the column a reader scans for the best offer,
  // and it would rank against genuine quotes.
  const allSelections = activeMarket?.selections ?? [];
  const realSelections = allSelections.filter((row) => !isOddsSeedSource(row));
  const visibleSelections = realSelections.length > 0 ? realSelections : allSelections;
  const hasSeedPrices = realSelections.length === 0 && allSelections.length > 0;
  const selectionGroups = useMemo(
    () => (activeMarket ? groupSelectionsByKey(visibleSelections) : new Map()),
    [activeMarket, visibleSelections],
  );
  const columnKeys = useMemo(() => {
    const order = ['home', 'draw', 'away'];
    const rank = (key: string) => {
      const index = order.indexOf(key);
      return index === -1 ? order.length : index;
    };
    return [...selectionGroups.keys()]
      .filter((key) => !isHiddenSelection(key))
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }, [selectionGroups]);
  // The history chart used to have its own row of pills, one per column, directly
  // under a table whose column headings already said the same thing. Two identical
  // label rows in a row read as two different controls, so the chart now simply
  // follows the first column — the one a reader was looking at first anyway.
  const selectedHistoryKey = columnKeys[0] ?? '';
  /** Slug → readable name. The history API returns slugs only, never display names. */
  const sourceNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const market of data?.markets ?? []) {
      for (const row of market.selections) map[row.sourceSlug] = row.sourceName;
    }
    return map;
  }, [data]);

  useEffect(() => {
    if (!activeMarket || !selectedHistoryKey || forbidden) {
      setHistoryPoints(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    void fetchOddsHistory(matchId, {
      marketKey: activeMarket.marketKey,
      selectionKey: selectedHistoryKey,
      limit: 500,
    })
      .then((res) => {
        if (!cancelled) setHistoryPoints(res?.points ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistoryPoints([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, activeMarket, selectedHistoryKey, forbidden]);

  if (forbidden) {
    return (
      <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-stext ring-1 ring-lborder">
        Prices are not available in your area right now.
      </p>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        title="No prices for this match yet"
        message="We have not added prices for this match. Try a match that is live or coming up."
        icon={Scale}
      />
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder" aria-busy="true">
        <Skeleton height={22} width={200} />
        <div className="mt-4 space-y-3">
          <Skeleton height={48} />
          <Skeleton height={120} />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="Prices could not be loaded"
        message="Something went wrong on our side. Please try again in a moment."
        icon={Scale}
      />
    );
  }

  const needsAgeGate = data.compliance.ageGatingRequired && !ageOk;
  const hasMarkets = data.markets.length > 0;
  const historyLabel = selectedHistoryKey
    ? labelForSelection(
        selectedHistoryKey,
        homeLabel,
        awayLabel,
        selectionGroups.get(selectedHistoryKey)?.[0]?.label,
      )
    : '';
  const marketTitle = activeMarket ? marketLabel(activeMarket) : 'Prices';
  const showStaleWarning =
    pollLive && visibleSelections.some((row) => isOddsCaptureStale(row.capturedAt)) === true;

  return (
    <div className="space-y-5">
      {needsAgeGate ? (
        <AgeGate
          onConfirm={() => {
            storeOddsAgeConsent();
            setAgeOk(true);
          }}
        />
      ) : null}

      {!needsAgeGate ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-stext">
                {hasSeedPrices ? 'Example prices' : 'Live prices'}
              </p>
              <h2 className={`mt-0.5 font-bold tracking-tight text-mtext ${compact ? 'text-lg' : 'text-xl'}`}>
                {hasMarkets && activeMarket ? marketTitle : 'Prices'}
              </h2>
            </div>
            <FormatToggle value={priceFormat} onChange={setPriceFormat} />
          </div>

          {showStaleWarning ? (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-mtext ring-1 ring-lborder">
              Some of these prices are over 15 minutes old. Check the time under each one.
            </p>
          ) : null}

          {hasSeedPrices ? (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-mtext ring-1 ring-lborder">
              These are example prices, so you can see how this page works. Real prices appear
              here as soon as we have them.
            </p>
          ) : null}

          {!hasMarkets && data.unavailable ? (
            <EmptyState
              title="No prices yet"
              message={data.unavailable}
              icon={Scale}
            >
              <Link href="/matches" className="text-sm font-semibold text-accent hover:underline">
                See other matches →
              </Link>
            </EmptyState>
          ) : null}

          {hasMarkets && activeMarket ? (
            <>
              {availableMarkets.length > 1 ? (
                <>
                  {commonMarkets.length > 0 ? (
                    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Odds markets">
                      {commonMarkets.map((market) => {
                        const active = market.marketKey === activeMarket.marketKey;
                        return (
                          <button
                            key={market.marketKey}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveMarketKey(market.marketKey)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                              active
                                ? 'bg-brand text-brand-fg ring-brand'
                                : 'bg-card text-mtext ring-lborder hover:bg-secondary'
                            }`}
                          >
                            {marketLabel(market)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  {extraMarkets.length > 0 ? (
                    <details
                      className="rounded-xl bg-card px-3 py-2 ring-1 ring-lborder"
                      open={commonMarkets.length === 0}
                    >
                      <summary className="cursor-pointer text-xs font-semibold text-stext">
                        More markets ({extraMarkets.length})
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {extraMarkets.map((market) => (
                          <button
                            key={market.marketKey}
                            type="button"
                            onClick={() => setActiveMarketKey(market.marketKey)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                              market.marketKey === activeMarket.marketKey
                                ? 'bg-brand text-brand-fg ring-brand'
                                : 'bg-secondary text-mtext ring-lborder hover:bg-card'
                            }`}
                          >
                            {marketLabel(market)}
                          </button>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </>
              ) : null}

              <div id="odds-market-panel" role="tabpanel" className="space-y-5">
                <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lborder px-4 py-3">
                    <p className="text-sm font-bold text-mtext">{marketTitle}</p>
                    {activeMarket.bookmakerMargin !== null && activeMarket.bookmakerMargin !== undefined ? (
                      <span
                        className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-stext"
                        title="Of every 100 you bet across both sides, this much goes to the bookmaker as their cut. Lower is better for you."
                      >
                        Payout {formatPayoutPercent(activeMarket.bookmakerMargin)}
                      </span>
                    ) : null}
                  </div>
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-lborder bg-secondary/60 text-xs uppercase tracking-wider text-stext">
                        {columnKeys.map((key) => (
                          <th key={key} className="px-4 py-2.5 font-semibold">
                            {labelForSelection(key, homeLabel, awayLabel, selectionGroups.get(key)?.[0]?.label)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {maxSourceRows(selectionGroups, columnKeys).map((rowIndex) => (
                        <tr key={rowIndex} className="border-b border-lborder/70 last:border-0">
                          {columnKeys.map((key) => {
                            const cell = selectionGroups.get(key)?.[rowIndex];
                            return (
                              <td key={key} className="align-top px-4 py-3">
                                {cell ? <PriceCell row={cell} format={priceFormat} allowBestBadge={!hasSeedPrices} /> : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {columnKeys.length > 0 ? (
                  historyLoading ? (
                    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder" aria-busy="true">
                      <Skeleton height={180} />
                    </div>
                  ) : (
                    <OddsHistoryChart
                      points={historyPoints ?? []}
                      selectionLabel={historyLabel}
                      sourceNames={sourceNames}
                    />
                  )
                ) : null}

                <OddsMarketRulesDisclosure marketKey={activeMarket.marketKey} />
              </div>

              {data.modelVsMarket ? <ModelVsMarketPanel data={data.modelVsMarket} homeLabel={homeLabel} awayLabel={awayLabel} /> : null}
            </>
          ) : null}

          <footer className="rounded-xl bg-secondary px-4 py-3 text-xs leading-relaxed text-stext ring-1 ring-lborder">
            <p>{data.compliance.disclaimer}</p>
          </footer>
        </>
      ) : null}
    </div>
  );
}

function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
      <h3 className="text-base font-bold text-mtext">Confirm your age</h3>
      <p className="mt-2 text-sm text-stext">
        You must be old enough to see betting prices where you live.
      </p>
      <button type="button" onClick={onConfirm} className="btn-brand mt-4 rounded-md px-5 py-2.5 text-sm font-semibold">
        I am old enough
      </button>
    </div>
  );
}

function FormatToggle({
  value,
  onChange,
}: {
  value: OddsPriceFormat;
  onChange: (_mode: OddsPriceFormat) => void;
}) {
  // Decimal is what almost every reader wants and what the feed is stored in, so it is
  // first. The worked examples that used to sit in the labels ("5/2", "+150") just
  // added three numbers to read before any price appeared.
  const modes: { key: OddsPriceFormat; label: string }[] = [
    { key: 'decimal', label: 'Decimal' },
    { key: 'fractional', label: 'Fractional' },
    { key: 'american', label: 'American' },
  ];
  return (
    <div className="flex flex-wrap rounded-full bg-secondary p-0.5 ring-1 ring-lborder" role="group" aria-label="Show prices as">
      {modes.map((mode) => (
        <button
          key={mode.key}
          type="button"
          onClick={() => onChange(mode.key)}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            value === mode.key ? 'bg-card text-mtext shadow-sm' : 'text-stext hover:text-mtext'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function PriceCell({
  row,
  format,
  allowBestBadge = true,
}: {
  row: OddsSelectionPrice;
  format: OddsPriceFormat;
  allowBestBadge?: boolean;
}) {
  const movement = formatMovementPercent(row.movementPercent);
  const movementTone =
    row.movementPercent !== null && row.movementPercent !== undefined && row.movementPercent > 0
      ? 'text-success'
      : row.movementPercent !== null && row.movementPercent !== undefined && row.movementPercent < 0
        ? 'text-danger'
        : 'text-stext';
  // The API flags the best row even when every row is seeded data, because the
  // seed happens to be the only quote. Repeating that as a recommendation would
  // be fabricating advice, so the badge is withheld for a market with no real
  // bookmakers behind it.
  const showBest = allowBestBadge && row.isBestDisplayedPrice;

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-stext">{row.sourceName}</p>
      <p className="font-mono text-lg font-black tabular-nums text-mtext">
        {formatOddsPrice(row.current, format)}
        {showBest ? (
          <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-accent">
            Best price
          </span>
        ) : null}
      </p>
      {row.opening ? (
        <p className="text-xs text-stext">
          Opened at {formatOddsPrice(row.opening, format)}
          {movement ? <span className={`ml-1 font-medium ${movementTone}`}>now {movement}</span> : null}
        </p>
      ) : null}
      <p
        className={`text-[10px] ${isOddsCaptureStale(row.capturedAt) ? 'font-medium text-warning' : 'text-stext'}`}
        title={`Received ${row.receivedAt}`}
      >
        {formatOddsUtc(row.capturedAt)}
      </p>
    </div>
  );
}

/**
 * What the number beside the prices actually is.
 *
 * On a live match the API prefers the live run over the pre-match one, which is correct —
 * a forecast made before the first ball is not a prediction of the situation on screen.
 * It also means the number silently changes meaning depending on the match state, so it
 * has to say which one it is. Returns null when the API states no stage, and the heading
 * then stays plain rather than guessing.
 */
function stageLabel(stage: ModelPredictionStage | null | undefined): string | null {
  if (stage === 'live') return 'Live';
  if (stage === 'pre_match') return 'Pre-match';
  return null;
}

/**
 * One row per side, with our number and the market's side by side.
 *
 * This used to be four boxes — "We think — India", "Prices suggest — India", and the
 * same again for the other side — under a paragraph explaining that our maths is not
 * advice. Two numbers in one row per team says the same thing with half the reading.
 */
function ModelVsMarketPanel({
  data,
  homeLabel,
  awayLabel,
}: {
  data: NonNullable<MatchOddsResponse['modelVsMarket']>;
  homeLabel: string;
  awayLabel: string;
}) {
  const stage = data.stage ?? null;
  const label = stageLabel(stage);
  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-stext">Our prediction</h3>
        {label ? (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mtext ring-1 ring-lborder">
            {label}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-stext">
        {stage === 'live'
          ? 'Our estimate for this match as it stands right now, next to what the prices say. A rough guess for interest only.'
          : 'Our own estimate, next to what the prices say. It is a rough guess for interest only.'}
      </p>
      <div className="mt-4 space-y-3">
        <ModelRow
          team={homeLabel}
          ours={modelPercent(data.homeWinProb)}
          market={impliedPercent(data.marketHomeImplied)}
        />
        <ModelRow
          team={awayLabel}
          ours={modelPercent(data.awayWinProb)}
          market={impliedPercent(data.marketAwayImplied)}
        />
      </div>
    </section>
  );
}

function ModelRow({ team, ours, market }: { team: string; ours: string; market: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-secondary px-3 py-2.5 ring-1 ring-lborder">
      <p className="min-w-0 truncate text-sm font-semibold text-mtext">{team}</p>
      <p className="font-mono text-sm tabular-nums text-stext">
        <span className="font-bold text-mtext">{ours}</span>
        <span className="mx-1.5 text-lborder">vs</span>
        {market}
      </p>
    </div>
  );
}

function labelForSelection(
  key: string,
  home: string,
  away: string,
  fallback?: string,
): string {
  return selectionLabel(key, home, away, fallback);
}

function maxSourceRows(groups: Map<string, OddsSelectionPrice[]>, keys: string[]): number[] {
  const max = Math.max(0, ...keys.map((k) => groups.get(k)?.length ?? 0));
  return Array.from({ length: max }, (_, i) => i);
}
