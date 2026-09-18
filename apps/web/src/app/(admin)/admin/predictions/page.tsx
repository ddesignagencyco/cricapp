'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import AdminPagination from '../../../../components/admin/AdminPagination';
import {
  AdminEntityLink,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../../../components/admin/AdminShared';
import { asPercent, stageLabel } from '../../../../lib/predictions';
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
  PredictionRun,
} from '../../../../types/predictions';
import { formatScheduled } from '../../../../utils/helpers';

const LIMIT = 20;

export default function AdminPredictionsPage() {
  const [models, setModels] = useState<AdminPredictionModelVersion[]>([]);
  const [calibration, setCalibration] = useState<AdminPredictionCalibration | null>(null);
  const [runs, setRuns] = useState<PredictionRun[]>([]);
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
    setLoadingCal(true);
    fetchAdminPredictionCalibration({
      modelVersion: calModel || undefined,
      bins: 10,
    })
      .then(setCalibration)
      .catch(() => setCalibration(null))
      .finally(() => setLoadingCal(false));
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Calibration</h2>
          <div className="w-56">
            <AdminSelect value={calModel} onChange={(e) => setCalModel(e.target.value)}>
              <option value="">Default pre-match model</option>
              {modelOptions.map((version) => (
                <option key={version} value={version}>{version}</option>
              ))}
            </AdminSelect>
          </div>
        </div>
        {loadingCal ? (
          <LoadingState />
        ) : !calibration ? (
          <EmptyState title="Calibration unavailable" message="Could not load reliability bins." />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Model" value={calibration.modelVersion} />
              <Stat label="Sample" value={String(calibration.sampleSize)} />
              <Stat label="ECE" value={calibration.expectedCalibrationError == null ? '—' : String(calibration.expectedCalibrationError)} />
              <Stat label="Bins" value={String(calibration.bins.length)} />
            </div>
            {calibration.latestFit && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Fit slope" value={String(calibration.latestFit.slope)} />
                <Stat label="Fit intercept" value={String(calibration.latestFit.intercept)} />
                <Stat label="Fit sample" value={String(calibration.latestFit.sampleSize)} />
                <Stat
                  label="Fit accuracy"
                  value={calibration.latestFit.accuracy == null ? '—' : asPercent(calibration.latestFit.accuracy)}
                />
                <Stat
                  label="Fit Brier"
                  value={calibration.latestFit.brierScore == null ? '—' : String(calibration.latestFit.brierScore)}
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
              <option value="">All models</option>
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
                    const id = (run as PredictionRun & { matchId?: string }).matchId;
                    return (
                      <tr key={run.runId} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                        <td className="px-3 py-2.5 font-mono">
                          {id ? <AdminEntityLink href={`/predictions/${id}`}>{id}</AdminEntityLink> : '—'}
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
            Plain-language summary of this stored model output.
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
  const lean = run.homeWinProb === run.awayWinProb
    ? 'The model called this even.'
    : run.homeWinProb > run.awayWinProb
      ? `The model favoured the home side (${asPercent(run.homeWinProb)} to win).`
      : `The model favoured the away side (${asPercent(run.awayWinProb)} to win).`;
  const situation = readableSituation(explanation);
  const factors = readableFactors(explanation);
  const reasons = Array.isArray(explanation.reasons)
    ? explanation.reasons.map(String).filter((reason) => reason && reason !== 'score')
    : [];
  const featureRows = flattenRecord(run.features);

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--admin-text)' }}>{lean}</p>
      <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
        {stageLabel(run.stage)} run from {run.modelVersion}, saved {when(run.createdAt)}.
        Confidence {prettyConfidence(run.confidence)} ({run.calibrationBand} band).
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Home win chance" value={asPercent(run.homeWinProb)} />
        <Stat label="Away win chance" value={asPercent(run.awayWinProb)} />
        <Stat label="When it was scored" value={when(run.createdAt)} />
        <Stat label="Model name" value={run.modelVersion} />
      </div>

      {run.matchId && (
        <AdminEntityLink href={`/predictions/${run.matchId}`}>Open this match on the public site</AdminEntityLink>
      )}

      {situation.length > 0 && (
        <Section title="Match situation the model used">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {situation.map((row) => (
              <Stat key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </Section>
      )}

      {range && (range.low != null || range.expected != null) && (
        <Section title="What score it expected">
          <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
            {rangeLabel(range.type)} between {range.low ?? '—'} and {range.high ?? '—'}
            {range.expected != null ? `, most likely ${range.expected}` : ''}
            {range.unit ? ` ${range.unit}` : ''}.
          </p>
        </Section>
      )}

      {partnership?.expectedAdditionalRuns != null && (
        <Section title="Next partnership">
          <p className="text-sm" style={{ color: 'var(--admin-text)' }}>
            About {partnership.expectedAdditionalRuns} more runs
            {partnership.horizonBalls != null ? ` in the next ${partnership.horizonBalls} balls` : ''}.
            {partnership.reliability ? ` Reliability: ${partnership.reliability}.` : ''}
          </p>
        </Section>
      )}

      {factors.length > 0 && (
        <Section title="What pushed the probability">
          <ul className="space-y-1.5 text-sm" style={{ color: 'var(--admin-text)' }}>
            {factors.map((factor) => (
              <li key={factor.label}>
                <span className="font-semibold">{factor.label}:</span> {factor.value}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {reasons.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
          Trigger: {reasons.join(', ')}
        </p>
      )}

      {featureRows.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>
            Show technical inputs
          </summary>
          <div className="mt-2">
            <KvTable rows={featureRows.map((row) => ({ key: humanKey(row.key), value: row.value }))} />
          </div>
        </details>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>{title}</p>
      {children}
    </div>
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

function pressureWords(value: number): string {
  if (value >= 0.66) return 'High';
  if (value >= 0.33) return 'Moderate';
  return 'Low';
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
  if (over != null && over !== '') rows.push({ label: 'Over', value: String(over) });
  if (inning != null && inning !== '') rows.push({ label: 'Innings', value: Number(inning) === 1 ? '1st innings' : `${inning}` });
  if (battingIsHome === true) rows.push({ label: 'Batting side', value: 'Home' });
  if (battingIsHome === false) rows.push({ label: 'Batting side', value: 'Away' });
  if (wickets != null && wickets !== '') rows.push({ label: 'Wickets down', value: String(wickets) });
  if (remainingBalls != null && remainingBalls !== '') rows.push({ label: 'Balls left', value: String(remainingBalls) });
  if (requiredRuns != null && requiredRuns !== '') rows.push({ label: 'Runs still needed', value: String(requiredRuns) });
  if (requiredRunRate != null && requiredRunRate !== '') rows.push({ label: 'Required run rate', value: String(requiredRunRate) });
  if (resourcesLeft != null && resourcesLeft !== '') rows.push({ label: 'Resources left', value: asPercent(Number(resourcesLeft)) });
  if (projectedTotal != null && projectedTotal !== '') rows.push({ label: 'Projected total', value: String(projectedTotal) });
  return rows;
}

function readableFactors(explanation: Record<string, unknown>): Array<{ label: string; value: string }> {
  const names: Record<string, string> = {
    scoring_rate: 'Scoring rate',
    wickets: 'Wickets',
    chase_pressure: 'Chase pressure',
    resources: 'Resources left',
  };
  const raw = explanation.factorAttributions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { factor?: string; impact?: number; contribution?: number };
      const value = Number(row.contribution ?? row.impact ?? NaN);
      if (!row.factor || !Number.isFinite(value) || value === 0) return null;
      const direction = value > 0 ? 'helped the home side' : 'helped the away side';
      return {
        label: names[row.factor] || row.factor.replace(/_/g, ' '),
        value: `${direction} (${value > 0 ? '+' : ''}${value.toFixed(2)})`,
      };
    })
    .filter((row): row is { label: string; value: string } => row !== null);
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
  if (value == null) return [];
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
    if (nested != null && typeof nested === 'object') return flattenRecord(nested, path);
    return [{ key: path, value: nested == null ? '—' : String(nested) }];
  });
}
