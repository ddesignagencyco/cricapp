'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';
import AdminPagination from '../../../../components/admin/AdminPagination';
import {
  AdminChip,
  AdminEntityLink,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../../../components/admin/AdminShared';
import { asPercent, isNil, stageLabel, xiNames } from '../../../../lib/predictions';
import {
  fetchAdminPredictionCalibration,
  fetchAdminPredictionModels,
  fetchAdminPredictionRun,
  fetchAdminPredictionRuns,
} from '../../../../services/predictions';
import type {
  AdminPredictionCalibration,
  AdminPredictionModelVersion,
  AdminPredictionRunDetail,
  PredictionPlayerPick,
} from '../../../../types/predictions';
import { formatScheduled } from '../../../../utils/helpers';

const LIMIT = 20;

export default function AdminPredictionsPage() {
  const [models, setModels] = useState<AdminPredictionModelVersion[]>([]);
  const [calibration, setCalibration] = useState<AdminPredictionCalibration | null>(null);
  const [runs, setRuns] = useState<AdminPredictionRunDetail[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [matchId, setMatchId] = useState('');
  const [stage, setStage] = useState('');
  const [modelVersion, setModelVersion] = useState('');
  const [calModel, setCalModel] = useState('');
  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingCal, setLoadingCal] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminPredictionRunDetail | null>(null);
  const [loadingRun, setLoadingRun] = useState(false);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLoadingModels(true);
    fetchAdminPredictionModels()
      .then(setModels)
      .catch(() => setError('Could not load model versions.'))
      .finally(() => setLoadingModels(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingCal(true);
    fetchAdminPredictionCalibration({
      modelVersion: calModel || undefined,
      bins: 10,
    })
      .then((next) => {
        if (!cancelled) setCalibration(next);
      })
      .catch(() => {
        if (!cancelled) setCalibration(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingCal(false);
      });
    return () => {
      cancelled = true;
    };
  }, [calModel]);

  const loadRuns = useCallback((nextPage: number) => {
    setLoadingRuns(true);
    fetchAdminPredictionRuns({
      page: nextPage,
      limit: LIMIT,
      matchId: matchId.trim() || undefined,
      stage: stage || undefined,
      modelVersion: modelVersion || undefined,
    })
      .then((res) => {
        setRuns(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => {
        setRuns([]);
        setTotal(0);
        setTotalPages(1);
        setError('Could not load prediction runs.');
      })
      .finally(() => setLoadingRuns(false));
  }, [matchId, stage, modelVersion]);

  useEffect(() => {
    loadRuns(page);
  }, [page, loadRuns]);

  useEffect(() => {
    if (loadingRun || selected) {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loadingRun, selected]);

  const openRun = (runId: string) => {
    setLoadingRun(true);
    setSelected(null);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    fetchAdminPredictionRun(runId)
      .then(setSelected)
      .catch(() => setSelected(null))
      .finally(() => setLoadingRun(false));
  };

  const modelOptions = [...new Set(models.map((m) => m.modelVersion))];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Predictions"
        subtitle="Review model versions, calibration bins and stored prediction runs."
      />

      {error && <ErrorState message={error} onRetry={() => { setError(''); loadRuns(page); }} />}

      <section className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Model versions</h2>
        {loadingModels ? (
          <LoadingState />
        ) : models.length === 0 ? (
          <EmptyState title="No model versions" message="Runs will appear after the prediction worker writes to the database." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {models.map((model) => (
              <div
                key={`${model.modelVersion}-${model.stage}`}
                className="rounded-md p-3"
                style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{model.modelVersion}</p>
                  {model.isCurrent && <StatusBadge status="active" />}
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                  {stageLabel(model.stage)} · {model.runCount} runs
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  First {when(model.firstRunAt)} · Last {when(model.lastRunAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Calibration</h2>
              {loadingCal ? (
                <Loader2 size={13} className="animate-spin" style={{ color: 'var(--admin-text-muted)' }} aria-hidden="true" />
              ) : null}
            </div>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              Reliability of settled pre-match guesses. This does not filter the run table below.
            </p>
          </div>
          <div className="w-56">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
              Score this model
            </label>
            <AdminSelect value={calModel} onChange={(e) => setCalModel(e.target.value)}>
              <option value="">Default pre-match model</option>
              {modelOptions.map((version) => (
                <option key={version} value={version}>{version}</option>
              ))}
            </AdminSelect>
          </div>
        </div>
        {loadingCal && !calibration ? (
          <div className="flex justify-center py-8" aria-busy="true" aria-label="Loading calibration">
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--admin-text-muted)' }} />
          </div>
        ) : !calibration ? (
          <EmptyState title="Calibration unavailable" message="Could not load reliability bins." />
        ) : (
          <div className="space-y-3" aria-busy={loadingCal}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Model" value={calibration.modelVersion} />
              <Stat label="Sample" value={String(calibration.sampleSize)} />
              <Stat label="ECE" value={isNil(calibration.expectedCalibrationError) ? '—' : String(calibration.expectedCalibrationError)} />
              <Stat label="Bins" value={String(calibration.bins.length)} />
            </div>
            {calibration.latestFit && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Fit slope" value={String(calibration.latestFit.slope)} />
                <Stat label="Fit intercept" value={String(calibration.latestFit.intercept)} />
                <Stat label="Fit sample" value={String(calibration.latestFit.sampleSize)} />
                <Stat
                  label="Fit accuracy"
                  value={isNil(calibration.latestFit.accuracy) ? '—' : asPercent(calibration.latestFit.accuracy)}
                />
                <Stat
                  label="Fit Brier"
                  value={isNil(calibration.latestFit.brierScore) ? '—' : String(calibration.latestFit.brierScore)}
                />
                <Stat label="Fit source" value={calibration.latestFit.source || '—'} />
                <Stat label="Fit saved" value={when(calibration.latestFit.createdAt)} />
              </div>
            )}
            {calibration.bins.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                No settled sample yet, so reliability bins are empty.
              </p>
            ) : (
              <div className="table-scroll">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {['Bin', 'Range', 'Predicted', 'Actual', 'n', 'Error'].map((h) => (
                        <th key={h} className="px-2 py-2 font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calibration.bins.map((bin) => (
                      <tr key={bin.bin} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td className="px-2 py-2 font-mono">{bin.bin}</td>
                        <td className="px-2 py-2 font-mono">{bin.minProbability}–{bin.maxProbability}</td>
                        <td className="px-2 py-2 font-mono">{asPercent(bin.meanPredicted)}</td>
                        <td className="px-2 py-2 font-mono">{asPercent(bin.actualRate)}</td>
                        <td className="px-2 py-2">{bin.sampleSize}</td>
                        <td className="px-2 py-2 font-mono">{bin.calibrationError}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="flex flex-col gap-2 p-3 md:flex-row md:items-center" style={{ borderBottom: '1px solid var(--admin-border)' }}>
          <AdminInput
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            placeholder="Filter match id"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1);
                loadRuns(1);
              }
            }}
          />
          <div className="w-40">
            <AdminSelect
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All stages</option>
              <option value="pre_match">Pre-match</option>
              <option value="live">Live</option>
            </AdminSelect>
          </div>
          <div className="w-52">
            <AdminSelect
              value={modelVersion}
              onChange={(e) => {
                setModelVersion(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All run models</option>
              {modelOptions.map((version) => (
                <option key={version} value={version}>{version}</option>
              ))}
            </AdminSelect>
          </div>
          <button
            type="button"
            className="btn-brand rounded-md px-3 py-2 text-xs font-bold"
            onClick={() => {
              setPage(1);
              loadRuns(1);
            }}
          >
            Filter
          </button>
        </div>

        {loadingRuns ? (
          <div className="p-4"><LoadingState variant="table" /></div>
        ) : runs.length === 0 ? (
          <EmptyState title="No prediction runs" message="Adjust filters or wait for the worker to score matches." />
        ) : (
          <>
            <div className="table-scroll">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                    {['Match', 'Stage', 'Model', 'Home', 'Away', 'Conf', 'Band', 'When', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const id = run.matchId;
                    const name = run.matchName;
                    return (
                      <tr key={run.runId} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td className="px-3 py-2.5">
                          {id ? (
                            <div className="min-w-[12rem]">
                              <AdminEntityLink href={`/predictions/${id}`}>
                                {name || id}
                              </AdminEntityLink>
                              {name ? (
                                <p className="mt-0.5 font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                                  {id}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5">{stageLabel(run.stage)}</td>
                        <td className="px-3 py-2.5 font-mono">{run.modelVersion}</td>
                        <td className="px-3 py-2.5 font-mono font-bold">{asPercent(run.homeWinProb)}</td>
                        <td className="px-3 py-2.5 font-mono font-bold">{asPercent(run.awayWinProb)}</td>
                        <td className="px-3 py-2.5 font-mono">{run.confidence}</td>
                        <td className="px-3 py-2.5">{run.calibrationBand}</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--admin-text-muted)' }}>{when(run.createdAt)}</td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            className="text-xs font-semibold"
                            style={{ color: 'var(--admin-accent)' }}
                            onClick={() => openRun(run.runId)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--admin-border)' }}>
              <AdminPagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
            </div>
          </>
        )}
      </section>

      {(loadingRun || selected) && (
        <RunDetail
          detailRef={detailRef}
          loading={loadingRun}
          run={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function RunDetail({
  detailRef,
  loading,
  run,
  onClose,
}: {
  detailRef: RefObject<HTMLElement | null>;
  loading: boolean;
  run: AdminPredictionRunDetail | null;
  onClose: () => void;
}) {
  return (
    <section
      ref={detailRef}
      className="rounded-lg p-4"
      style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Selected run</h2>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Stored output only — no new probabilities.
          </p>
        </div>
        <button type="button" className="text-xs font-semibold" style={{ color: 'var(--admin-text-muted)' }} onClick={onClose}>
          Close
        </button>
      </div>
      {loading ? (
        <LoadingState />
      ) : run ? (
        <RunDetailBody run={run} />
      ) : (
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Could not load that run.</p>
      )}
    </section>
  );
}

function RunDetailBody({ run }: { run: AdminPredictionRunDetail }) {
  const explanation = run.explanation || {};
  const range = run.scoreRange;
  const partnership = run.partnershipProjection;
  const favourite = run.homeWinProb === run.awayWinProb
    ? 'Even'
    : run.homeWinProb > run.awayWinProb
      ? 'Home'
      : 'Away';
  const situation = readableSituation(explanation);
  const factors = readableFactors(explanation);
  const conditions = readableConditions(explanation);
  const toss = readableToss(explanation, run.features);
  const venue = asText(nested(run.features, 'venue')) || asText(nested(run.features, 'venue.name'));
  const format = asText(nested(run.features, 'format'));
  const batters = playerLines(run.topBatters);
  const bowlers = playerLines(run.topBowlers);
  const homeXi = xiNames(run.xi, 'home');
  const awayXi = xiNames(run.xi, 'away');
  const xiMeta = run.xi && typeof run.xi === 'object'
    ? [asText(run.xi.reliability), asText(run.xi.method)].filter(Boolean).join(' · ')
    : '';
  const reasons = Array.isArray(explanation.reasons)
    ? explanation.reasons.map(String).filter((reason) => reason && reason !== 'score')
    : [];
  const delta = Number(explanation.deltaFromPrevious);
  const featureRows = flattenRecord(run.features);
  const liveMeters = [
    !isNil(run.momentum) ? { label: 'Momentum', value: asPercent(run.momentum) } : null,
    !isNil(run.pressureIndex) ? { label: 'Pressure', value: asPercent(run.pressureIndex) } : null,
    !isNil(run.wicketRisk) ? { label: 'Wicket risk', value: asPercent(run.wicketRisk) } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);
  const homeShare = Math.max(0, Math.min(100, Number(run.homeWinProb) * 100));
  const facts = [
    toss ? { label: 'Toss', value: toss } : null,
    venue ? { label: 'Venue', value: venue } : null,
    format ? { label: 'Format', value: format } : null,
    ...conditions.map((line) => ({ label: line.label, value: line.value })),
    Number.isFinite(delta) && delta !== 0
      ? { label: 'Change vs last live', value: `${delta > 0 ? '+' : ''}${asPercent(delta)} home` }
      : null,
    reasons.length > 0 ? { label: 'Change trigger', value: reasons.join(', ') } : null,
    !isNil(partnership?.expectedAdditionalRuns)
      ? {
          label: 'Partnership',
          value: `${partnership.expectedAdditionalRuns} more runs${!isNil(partnership.horizonBalls) ? ` / ${partnership.horizonBalls} balls` : ''}${partnership.reliability ? ` · ${partnership.reliability}` : ''}`,
        }
      : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AdminChip label={stageLabel(run.stage)} tone="info" />
        <AdminChip label={`${prettyConfidence(run.confidence)} ${run.calibrationBand}`} tone={bandChip(run.calibrationBand)} />
        <AdminChip label={run.modelVersion} tone="neutral" />
        <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{when(run.createdAt)}</span>
      </div>

      {run.matchId && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            {run.matchName || run.matchId}
          </p>
          <AdminEntityLink href={`/predictions/${run.matchId}`}>Open public match</AdminEntityLink>
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel question="Who was favoured to win, and how sure was it?">
          <p className="mb-3 text-sm" style={{ color: 'var(--admin-text)' }}>
            Favoured <span className="font-semibold">{favourite}</span>
            {' · '}
            confidence {prettyConfidence(run.confidence)} ({run.calibrationBand})
          </p>
          <div className="mb-2 flex justify-between text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            <span>Home {asPercent(run.homeWinProb)}</span>
            <span>Away {asPercent(run.awayWinProb)}</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--admin-warning-bg)' }}>
            <div className="h-full" style={{ width: `${homeShare}%`, background: 'var(--admin-accent)' }} />
          </div>
        </Panel>

        {range && (!isNil(range.low) || !isNil(range.expected)) ? (
          <Panel question="What score did it expect?">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Low" value={`${range.low ?? '—'}`} />
              <Stat label="Likely" value={`${range.expected ?? '—'}`} />
              <Stat label="High" value={`${range.high ?? '—'}`} />
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              {rangeLabel(range.type)}{range.unit ? ` · ${range.unit}` : ''}
            </p>
          </Panel>
        ) : (
          <div />
        )}
      </div>

      {factors.length > 0 && (
        <Panel question="What pushed the probability?">
          <ul className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
            {factors.map((factor) => (
              <li key={factor.factor} className="flex flex-wrap items-start justify-between gap-2 py-2.5" style={{ borderColor: 'var(--admin-border)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{factor.question}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{factor.answer}</p>
                </div>
                <AdminChip label={factor.side} tone={factor.side === 'Home' ? 'info' : factor.side === 'Away' ? 'warning' : 'neutral'} />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {situation.length > 0 && (
        <Panel question="What match situation was stored when this ran?">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {situation.map((row) => (
              <Stat key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </Panel>
      )}

      {liveMeters.length > 0 && (
        <Panel question="What live momentum, pressure and wicket-risk were stored?">
          <div className="grid grid-cols-3 gap-2">
            {liveMeters.map((row) => (
              <Stat key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </Panel>
      )}

      {facts.length > 0 && (
        <Panel question="Was toss, venue or weather already in this run?">
          <dl>
            {facts.map((row) => (
              <div
                key={`${row.label}-${row.value}`}
                className="flex items-start justify-between gap-4 py-2"
                style={{ borderBottom: '1px solid var(--admin-border)' }}
              >
                <dt className="shrink-0 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{row.label}</dt>
                <dd className="text-right text-sm" style={{ color: 'var(--admin-text)' }}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      )}

      {(batters.length > 0 || bowlers.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {batters.length > 0 && (
            <Panel question="Who was stored as most likely top batter?">
              <PlayerList rows={batters} />
            </Panel>
          )}
          {bowlers.length > 0 && (
            <Panel question="Who was stored as most likely top wicket-taker?">
              <PlayerList rows={bowlers} />
            </Panel>
          )}
        </div>
      )}

      {(homeXi.length > 0 || awayXi.length > 0) && (
        <Panel question="What playing XI snapshot was stored?" hint={xiMeta || undefined}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {homeXi.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>Home</p>
                <p className="text-sm leading-6" style={{ color: 'var(--admin-text)' }}>{homeXi.join(', ')}</p>
              </div>
            )}
            {awayXi.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>Away</p>
                <p className="text-sm leading-6" style={{ color: 'var(--admin-text)' }}>{awayXi.join(', ')}</p>
              </div>
            )}
          </div>
        </Panel>
      )}

      {featureRows.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>
            Technical inputs
          </summary>
          <div className="mt-2">
            <KvTable rows={featureRows.map((row) => ({ key: humanKey(row.key), value: row.value }))} />
          </div>
        </details>
      )}
    </div>
  );
}

function Panel({ question, hint, children }: { question: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-md p-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)' }}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{question}</p>
        {hint ? <p className="shrink-0 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function PlayerList({ rows }: { rows: Array<{ name: string; chance: string | null }> }) {
  return (
    <ul className="space-y-1 text-sm" style={{ color: 'var(--admin-text)' }}>
      {rows.map((row) => (
        <li key={row.name} className="flex justify-between gap-3">
          <span className="truncate">{row.name}</span>
          {row.chance ? <span className="font-mono text-xs">{row.chance}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function KvTable({ title, rows }: { title?: string; rows: Array<{ key: string; value: string }> }) {
  return (
    <div>
      {title && (
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
          {title}
        </p>
      )}
      <div className="table-scroll max-h-72 overflow-auto rounded-md" style={{ border: '1px solid var(--admin-border)' }}>
        <table className="w-full text-left text-xs">
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <td className="px-2 py-1.5 font-mono" style={{ color: 'var(--admin-text-secondary)', width: '40%' }}>{row.key}</td>
                <td className="px-2 py-1.5 break-all" style={{ color: 'var(--admin-text)' }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md p-3" style={{ border: '1px solid var(--admin-border)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>{label}</p>
      <p className="mt-1 truncate text-sm font-semibold" style={{ color: 'var(--admin-text)' }} title={value}>{value}</p>
    </div>
  );
}

function when(iso?: string | null): string {
  if (!iso) return '—';
  const { date, time } = formatScheduled(iso);
  return `${date} ${time}`.trim() || '—';
}

function prettyConfidence(value: number): string {
  if (value > 0 && value <= 1) return asPercent(value);
  return String(value);
}

function rangeLabel(type?: string): string {
  if (type === 'first_innings') return 'First-innings total';
  if (type === 'chase_total') return 'Chase total';
  return type ? type.replace(/_/g, ' ') : 'Score';
}

function readableSituation(explanation: Record<string, unknown>): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const over = explanation.over;
  const inning = explanation.inning;
  const wickets = explanation.wickets;
  const remainingBalls = explanation.remainingBalls;
  const requiredRuns = explanation.requiredRuns;
  const requiredRunRate = explanation.requiredRunRate;
  const resourcesLeft = explanation.resourcesLeft;
  const projectedTotal = explanation.projectedTotal;
  const battingIsHome = explanation.battingIsHome;
  if (!isNil(over) && over !== '') rows.push({ label: 'Over', value: String(over) });
  if (!isNil(inning) && inning !== '') rows.push({ label: 'Innings', value: Number(inning) === 1 ? '1st innings' : `${inning}` });
  if (battingIsHome === true) rows.push({ label: 'Batting side', value: 'Home' });
  if (battingIsHome === false) rows.push({ label: 'Batting side', value: 'Away' });
  if (!isNil(wickets) && wickets !== '') rows.push({ label: 'Wickets down', value: String(wickets) });
  if (!isNil(remainingBalls) && remainingBalls !== '') rows.push({ label: 'Balls left', value: String(remainingBalls) });
  if (!isNil(requiredRuns) && requiredRuns !== '') rows.push({ label: 'Runs still needed', value: String(requiredRuns) });
  if (!isNil(requiredRunRate) && requiredRunRate !== '') rows.push({ label: 'Required run rate', value: String(requiredRunRate) });
  if (!isNil(resourcesLeft) && resourcesLeft !== '') rows.push({ label: 'Resources left', value: asPercent(Number(resourcesLeft)) });
  if (!isNil(projectedTotal) && projectedTotal !== '') rows.push({ label: 'Projected total', value: String(projectedTotal) });
  return rows;
}

function readableFactors(explanation: Record<string, unknown>): Array<{
  factor: string;
  question: string;
  answer: string;
  side: 'Home' | 'Away' | 'None';
  abs: number;
}> {
  const questions: Record<string, string> = {
    form: 'Did recent form move the probability?',
    head_to_head: 'Did head-to-head record move it?',
    table: 'Did table position move it?',
    venue: 'Did the venue move it?',
    toss: 'Did the toss sit in this probability?',
    conditions: 'Did pitch or weather move the win chance?',
    xi: 'Did the stored XI move it?',
    scoring_rate: 'Did the scoring rate move it?',
    wickets: 'Did wickets move it?',
    chase_pressure: 'Did chase pressure move it?',
    resources: 'Did remaining resources move it?',
  };
  const raw = explanation.factorAttributions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { factor?: string; impact?: number; contribution?: number };
      const value = Number(row.contribution ?? row.impact ?? NaN);
      if (!row.factor || !Number.isFinite(value)) return null;
      const label = row.factor.replace(/_/g, ' ');
      const side = value > 0 ? 'Home' : value < 0 ? 'Away' : 'None';
      const display = `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
      return {
        factor: row.factor,
        question: questions[row.factor] || `Did ${label} move the probability?`,
        answer: value === 0
          ? `No pull either way (${display}).`
          : `Yes — helped ${side.toLowerCase()} (${display}).`,
        side,
        abs: Math.abs(value),
      };
    })
    .filter((row): row is { factor: string; question: string; answer: string; side: 'Home' | 'Away' | 'None'; abs: number } => row !== null)
    .sort((a, b) => b.abs - a.abs);
}

function readableConditions(explanation: Record<string, unknown>): Array<{ label: string; value: string }> {
  const impact = explanation.conditionsImpact;
  if (!impact || typeof impact !== 'object') return [];
  const rec = impact as { runs?: number; factors?: unknown };
  const rows: Array<{ label: string; value: string }> = [];
  if (Number.isFinite(Number(rec.runs)) && Number(rec.runs) !== 0) {
    const runs = Number(rec.runs);
    rows.push({ label: 'Conditions vs score', value: `${runs > 0 ? '+' : ''}${runs} runs` });
  }
  if (!Array.isArray(rec.factors)) return rows;
  for (const item of rec.factors) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { factor?: string; impactRuns?: number; reason?: string };
    if (!row.factor) continue;
    const runs = Number(row.impactRuns);
    const shift = Number.isFinite(runs) ? `${runs > 0 ? '+' : ''}${runs} runs` : 'no shift';
    rows.push({
      label: row.factor.replace(/_/g, ' '),
      value: row.reason ? `${shift} · ${row.reason}` : shift,
    });
  }
  return rows;
}

function readableToss(explanation: Record<string, unknown>, features?: Record<string, unknown> | null): string | null {
  const adjusted = explanation.tossAdjusted === true;
  const decision = asText(explanation.tossDecision) || asText(nested(features, 'toss.decision'));
  const wonBy = asText(nested(features, 'toss.wonBy')) || asText(nested(features, 'toss.won_by'));
  if (!adjusted && !decision && !wonBy) return null;
  if (!adjusted) return 'Stored, not adjusted';
  return [wonBy ? `Won by ${wonBy}` : 'Included', decision].filter(Boolean).join(' · ');
}

function bandChip(band: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (band) {
    case 'high':
      return 'success';
    case 'medium':
      return 'warning';
    case 'low':
      return 'danger';
    default:
      return 'neutral';
  }
}

function playerLines(picks?: PredictionPlayerPick[] | null): Array<{ name: string; chance: string | null }> {
  if (!Array.isArray(picks)) return [];
  return picks
    .map((player, index) => {
      const name = String(player.playerName || player.name || '').trim();
      if (!name) return null;
      const chance = isNil(player.probability) ? null : asPercent(Number(player.probability));
      return { name: name || `Player ${index + 1}`, chance };
    })
    .filter((row): row is { name: string; chance: string | null } => row !== null)
    .slice(0, 5);
}

function nested(source: Record<string, unknown> | null | undefined, path: string): unknown {
  if (!source) return null;
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function asText(value: unknown): string | null {
  if (isNil(value) || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as Record<string, unknown>;
    return asText(rec.name ?? rec.venue ?? rec.info ?? rec.decision ?? null);
  }
  return null;
}

function humanKey(key: string): string {
  return key
    .replace(/\[(\d+)\]/g, ' $1')
    .replace(/[._]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenRecord(value: unknown, prefix = ''): Array<{ key: string; value: string }> {
  if (isNil(value)) return [];
  if (typeof value !== 'object') {
    return [{ key: prefix || 'value', value: String(value) }];
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return prefix ? [{ key: prefix, value: '[]' }] : [];
    return value.flatMap((item, index) => flattenRecord(item, prefix ? `${prefix}[${index}]` : `[${index}]`));
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return prefix ? [{ key: prefix, value: '{}' }] : [];
  return entries.flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!isNil(nested) && typeof nested === 'object') return flattenRecord(nested, path);
    return [{ key: path, value: isNil(nested) ? '—' : String(nested) }];
  });
}
