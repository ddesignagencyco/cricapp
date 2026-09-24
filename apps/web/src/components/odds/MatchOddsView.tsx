'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import EmptyState from '../EmptyState';
import { Skeleton } from '../skeletons/Skeletons';
import OddsHistoryChart from './OddsHistoryChart';
import OddsMarketRulesDisclosure from './OddsMarketRulesDisclosure';
import {
  formatMarginPercent,
  formatMovementPercent,
  formatOddsPrice,
  formatOddsUtc,
  groupSelectionsByKey,
  impliedPercent,
  isOddsCaptureStale,
  isOddsSeedSource,
  modelPercent,
  readOddsAgeConsent,
  storeOddsAgeConsent,
} from '../../lib/oddsDisplay';
import { marketDisplayName } from '../../lib/oddsMarketRules';
import { fetchMatchOdds, fetchOddsHistory } from '../../services/odds';
import type {
  MatchOddsResponse,
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
  const [historySelection, setHistorySelection] = useState('home');
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

  const availableMarkets = useMemo(() => {
    if (!data) return [];
    return [...data.markets].sort((a, b) => {
      const aRank = a.marketKey === 'match_winner' ? 0 : 1;
      const bRank = b.marketKey === 'match_winner' ? 0 : 1;
      return aRank - bRank || a.name.localeCompare(b.name);
    });
  }, [data]);
  const activeMarket = availableMarkets.find((market) => market.marketKey === activeMarketKey)
    ?? availableMarkets.find((market) => market.marketKey === 'match_winner')
    ?? availableMarkets[0]
    ?? null;
  const selectionGroups = useMemo(
    () => (activeMarket ? groupSelectionsByKey(activeMarket.selections) : new Map()),
    [activeMarket],
  );
  const columnKeys = useMemo(() => {
    const order = ['home', 'draw', 'away'];
    const rank = (key: string) => {
      const index = order.indexOf(key);
      return index === -1 ? order.length : index;
    };
    return [...selectionGroups.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }, [selectionGroups]);
  const selectedHistoryKey = selectionGroups.has(historySelection)
    ? historySelection
    : columnKeys[0] ?? '';

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
        Odds comparison is not available in this region or environment.
      </p>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        title="No odds stored yet"
        message="Licensed prices are not saved for this fixture. Run the dev odds seed against this match id, or try an upcoming/live fixture."
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
        title="Odds unavailable"
        message="We could not load comparison data right now."
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
  const marketTitle = activeMarket ? marketDisplayName(activeMarket.name) : 'Odds comparison';
  const hasSeedPrices = activeMarket?.selections.some((row) => isOddsSeedSource(row)) === true;
  const showStaleWarning =
    pollLive &&
    activeMarket?.selections.some((row) => isOddsCaptureStale(row.capturedAt)) === true;

  return (
    <div className="space-y-5">
      <OddsComplianceBanner compliance={data.compliance} />

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
                {hasSeedPrices ? 'Development seed comparison' : 'Licensed price comparison'}
              </p>
              <h2 className={`mt-0.5 font-bold tracking-tight text-mtext ${compact ? 'text-lg' : 'text-xl'}`}>
                {hasMarkets && activeMarket ? marketTitle : 'Odds comparison'}
              </h2>
            </div>
            <FormatToggle value={priceFormat} onChange={setPriceFormat} />
          </div>

          {showStaleWarning ? (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-mtext ring-1 ring-lborder">
              Some displayed prices are more than 15 minutes old. Check the timestamp on each source before relying on them.
            </p>
          ) : null}

          {hasSeedPrices ? (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs text-mtext ring-1 ring-lborder">
              Development seed prices are shown for UI testing. Live Sportradar prices use this same view when available.
            </p>
          ) : null}

          {!hasMarkets && data.unavailable ? (
            <EmptyState
              title="No licensed prices yet"
              message={data.unavailable}
              icon={Scale}
            >
              <Link href="/matches" className="text-sm font-semibold text-accent hover:underline">
                Browse fixtures →
              </Link>
            </EmptyState>
          ) : null}

          {hasMarkets && activeMarket ? (
            <>
              {availableMarkets.length > 1 ? (
                <div
                  className="flex flex-wrap gap-2"
                  role="tablist"
                  aria-label="Odds markets"
                >
                  {availableMarkets.map((market) => {
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
                        {marketDisplayName(market.name)}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div id="odds-market-panel" role="tabpanel" className="space-y-5">
                <OddsMarketRulesDisclosure marketKey={activeMarket.marketKey} />

                <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lborder px-4 py-3">
                    <p className="text-sm font-bold text-mtext">{marketDisplayName(activeMarket.name)}</p>
                    {activeMarket.bookmakerMargin !== null && activeMarket.bookmakerMargin !== undefined ? (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-stext">
                        Market margin {formatMarginPercent(activeMarket.bookmakerMargin)}
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
                                {cell ? <PriceCell row={cell} format={priceFormat} /> : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {columnKeys.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2" aria-label="History selection">
                      {columnKeys.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setHistorySelection(key)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                            selectedHistoryKey === key
                              ? 'bg-brand text-brand-fg ring-brand'
                              : 'bg-card text-mtext ring-lborder hover:bg-secondary'
                          }`}
                        >
                          {labelForSelection(key, homeLabel, awayLabel, selectionGroups.get(key)?.[0]?.label)}
                        </button>
                      ))}
                    </div>

                    {historyLoading ? (
                      <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder" aria-busy="true">
                        <Skeleton height={180} />
                      </div>
                    ) : (
                      <OddsHistoryChart points={historyPoints ?? []} selectionLabel={historyLabel} />
                    )}
                  </>
                ) : null}
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

function OddsComplianceBanner({ compliance }: { compliance: MatchOddsResponse['compliance'] }) {
  return (
    <div className="rounded-xl border border-lborder bg-brand-soft px-4 py-3 text-sm leading-relaxed text-mtext">
      <p className="font-medium">{compliance.responsibleUseMessage}</p>
    </div>
  );
}

function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
      <h3 className="text-base font-bold text-mtext">Age confirmation</h3>
      <p className="mt-2 text-sm text-stext">
        You must be of legal age to view odds comparison in your region. This is informational only — not betting advice.
      </p>
      <button type="button" onClick={onConfirm} className="btn-brand mt-4 rounded-md px-5 py-2.5 text-sm font-semibold">
        I confirm I am of legal age
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
  const modes: OddsPriceFormat[] = ['decimal', 'fractional', 'american'];
  return (
    <div className="flex rounded-full bg-secondary p-0.5 ring-1 ring-lborder" role="group" aria-label="Odds format">
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
            value === mode ? 'bg-card text-mtext shadow-sm' : 'text-stext hover:text-mtext'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  );
}

function PriceCell({ row, format }: { row: OddsSelectionPrice; format: OddsPriceFormat }) {
  const movement = formatMovementPercent(row.movementPercent);
  const movementTone =
    row.movementPercent !== null && row.movementPercent !== undefined && row.movementPercent > 0
      ? 'text-success'
      : row.movementPercent !== null && row.movementPercent !== undefined && row.movementPercent < 0
        ? 'text-danger'
        : 'text-stext';

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-stext">{row.sourceName}</p>
      <p className="font-mono text-lg font-black tabular-nums text-mtext">
        {formatOddsPrice(row.current, format)}
        {row.isBestDisplayedPrice ? (
          <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-accent">
            Best displayed price
          </span>
        ) : null}
      </p>
      {row.opening ? (
        <p className="text-xs text-stext">
          Open {formatOddsPrice(row.opening, format)}
          {movement ? <span className={`ml-1 font-medium ${movementTone}`}>{movement}</span> : null}
        </p>
      ) : null}
      <p
        className={`text-[10px] ${isOddsCaptureStale(row.capturedAt) ? 'font-medium text-warning' : 'text-stext'}`}
        title={`Received ${row.receivedAt}`}
      >
        Price time {formatOddsUtc(row.capturedAt)}
      </p>
    </div>
  );
}

function ModelVsMarketPanel({
  data,
  homeLabel,
  awayLabel,
}: {
  data: NonNullable<MatchOddsResponse['modelVsMarket']>;
  homeLabel: string;
  awayLabel: string;
}) {
  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <h3 className="text-sm font-bold uppercase tracking-wider text-stext">Analysis</h3>
      <p className="mt-1 text-xs leading-relaxed text-stext">
        Our stored prediction model estimates match win
        probability for informational comparison. It may not follow the same settlement rules as bookmakers (D/L,
        voids, super-over timing). This is not betting advice.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CompareRow label={`Prediction model — ${homeLabel}`} value={modelPercent(data.homeWinProb)} />
        <CompareRow label={`Market implied — ${homeLabel}`} value={impliedPercent(data.marketHomeImplied)} />
        <CompareRow label={`Prediction model — ${awayLabel}`} value={modelPercent(data.awayWinProb)} />
        <CompareRow label={`Market implied — ${awayLabel}`} value={impliedPercent(data.marketAwayImplied)} />
      </div>
      <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs leading-relaxed text-stext">{data.note}</p>
    </section>
  );
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2.5 ring-1 ring-lborder">
      <p className="text-[11px] font-medium text-stext">{label}</p>
      <p className="font-mono text-lg font-bold tabular-nums text-mtext">{value}</p>
    </div>
  );
}

function labelForSelection(
  key: string,
  home: string,
  away: string,
  fallback?: string,
): string {
  if (key === 'home') return home;
  if (key === 'away') return away;
  if (key === 'draw') return 'Draw';
  return fallback || key;
}

function maxSourceRows(groups: Map<string, OddsSelectionPrice[]>, keys: string[]): number[] {
  const max = Math.max(0, ...keys.map((k) => groups.get(k)?.length ?? 0));
  return Array.from({ length: max }, (_, i) => i);
}
