'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminField, AdminInput, AdminSelect, CardHeader, CardPanel, EmptyState, ErrorState, LoadingState } from './AdminShared';
import {
  ADSENSE_DATE_RANGES,
  ADSENSE_DIMENSIONS,
  ADSENSE_METRICS,
  DEFAULT_REPORT_DIMENSIONS,
  DEFAULT_REPORT_LIMIT,
  DEFAULT_REPORT_METRICS,
  adSenseErrorMessage,
  adSenseMetricKind,
  formatAdSenseCell,
  formatAdSenseCount,
  formatAdSenseCurrency,
  parseAdSenseNumber,
  validateAdSenseDateRange,
  type AdSenseDateRange,
  type AdSenseDimension,
  type AdSenseMetric,
} from '../../services/adsense';
import { useAdSenseReportQuery } from '../../queries/useAdSenseQueries';

const FILTER_DEBOUNCE_MS = 400;

const DIMENSION_LABELS: Record<AdSenseDimension, string> = {
  DATE: 'Date',
  AD_UNIT_ID: 'Ad unit id',
  AD_CLIENT_ID: 'Ad client id',
  DOMAIN_NAME: 'Domain name',
  URL: 'URL',
  COUNTRY_CODE: 'Country code',
  DEVICE_TYPE_SIZE: 'Device type & size',
};

const METRIC_LABELS: Record<AdSenseMetric, string> = {
  ESTIMATED_EARNINGS: 'Estimated earnings',
  ESTIMATED_PAGE_VIEWS: 'Estimated page views',
  PAGE_VIEWS: 'Page views',
  IMPRESSIONS: 'Impressions',
  IMPRESSIONS_RPM: 'Impressions RPM',
  PAGE_VIEWS_RPM: 'Page views RPM',
  CLICKS: 'Clicks',
  AD_REQUESTS: 'Ad requests',
  AD_REQUESTS_SHOWN: 'Ad requests shown',
  AD_REQUESTS_BLOCKED: 'Ad requests blocked',
  MATCHED_AD_REQUESTS: 'Matched ad requests',
  AD_REQUESTS_RPM: 'Ad requests RPM',
  AD_REQUEST_TARGETING: 'Ad request targeting',
  COST_PER_CLICK: 'Cost per click',
  COST_PER_THOUSAND_IMPRESSIONS: 'Cost per thousand impressions',
};

export default function AdSenseEarningsPanel({ enabled }: { enabled: boolean }) {
  const [dateRange, setDateRange] = useState<AdSenseDateRange>('LAST_30_DAYS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dimensions, setDimensions] = useState<AdSenseDimension[]>(DEFAULT_REPORT_DIMENSIONS);
  const [metrics, setMetrics] = useState<AdSenseMetric[]>(DEFAULT_REPORT_METRICS);
  const [currencyCode, setCurrencyCode] = useState('');
  const [adUnitId, setAdUnitId] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [debouncedAdUnitId, setDebouncedAdUnitId] = useState('');

  // Each distinct parameter set is a separate upstream call, so debounce the free-text
  // filter rather than firing one request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedAdUnitId(adUnitId.trim()), FILTER_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [adUnitId]);

  const isCustom = dateRange === 'CUSTOM';
  const effectiveDateRange = isCustom ? undefined : dateRange;

  const query = useAdSenseReportQuery(
    {
      dateRange: effectiveDateRange,
      startDate: isCustom ? startDate : undefined,
      endDate: isCustom ? endDate : undefined,
      dimensions,
      metrics,
      adUnitId: debouncedAdUnitId || undefined,
      currencyCode: currencyCode.trim().toUpperCase() || undefined,
    },
    enabled && !dateError,
  );

  const onApplyCustomRange = () => {
    setDateError(validateAdSenseDateRange(startDate, endDate));
  };

  const onPickRange = (value: AdSenseDateRange) => {
    setDateRange(value);
    if (value !== 'CUSTOM') setDateError(null);
  };

  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const report = query.data;

  // Totals come back as strings like everything else, so they need parsing too.
  const totals = useMemo(() => {
    if (!report?.totals) return null;
    return report.totals;
  }, [report?.totals]);

  return (
    <CardPanel>
      <CardHeader>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Earnings
          </h2>
          <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            Cached 5 minutes per filter combination.
          </p>
        </div>
      </CardHeader>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminField label="Date range" htmlFor="adsense-date-range">
            <AdminSelect id="adsense-date-range" value={dateRange} onChange={(e) => onPickRange(e.target.value as AdSenseDateRange)}>
              {ADSENSE_DATE_RANGES.filter((range) => range !== 'CUSTOM').map((range) => (
                <option key={range} value={range}>
                  {range.replace(/_/g, ' ').toLowerCase()}
                </option>
              ))}
              <option value="CUSTOM">custom</option>
            </AdminSelect>
          </AdminField>

          <AdminField label="Currency code" htmlFor="adsense-currency" hint="ISO-4217. Defaults to the account currency.">
            <AdminInput
              id="adsense-currency"
              maxLength={3}
              value={currencyCode}
              placeholder="USD"
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
            />
          </AdminField>

          <AdminField label="Ad unit filter" htmlFor="adsense-ad-unit" hint="Bare slot id or ca-pub-…:… reporting id.">
            <AdminInput
              id="adsense-ad-unit"
              value={adUnitId}
              placeholder="All ad units"
              onChange={(e) => setAdUnitId(e.target.value)}
            />
          </AdminField>
        </div>

        {isCustom ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <AdminField label="Start date" htmlFor="adsense-start">
              <AdminInput id="adsense-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </AdminField>
            <AdminField label="End date" htmlFor="adsense-end" hint="Both dates are required together. Max 400 days.">
              <AdminInput id="adsense-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </AdminField>
            <button
              type="button"
              onClick={onApplyCustomRange}
              className="rounded-md px-3 py-2 text-xs font-bold"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            >
              Apply
            </button>
            {dateError ? (
              <p className="text-[11px] font-medium sm:col-span-3" style={{ color: 'var(--admin-danger)' }}>
                {dateError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
              Dimensions
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {ADSENSE_DIMENSIONS.map((dimension) => {
                const active = dimensions.includes(dimension);
                return (
                  <button
                    key={dimension}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDimensions((prev) => (prev.length === 1 && prev[0] === dimension ? prev : toggle(prev, dimension)))}
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      border: `1px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                      background: active ? 'var(--admin-info-bg)' : 'var(--admin-input-bg)',
                      color: active ? 'var(--admin-accent)' : 'var(--admin-text-secondary)',
                    }}
                  >
                    {DIMENSION_LABELS[dimension]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
              Metrics
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {ADSENSE_METRICS.map((metric) => {
                const active = metrics.includes(metric);
                return (
                  <button
                    key={metric}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setMetrics((prev) => (prev.length === 1 && prev[0] === metric ? prev : toggle(prev, metric)))
                    }
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      border: `1px solid ${active ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                      background: active ? 'var(--admin-info-bg)' : 'var(--admin-input-bg)',
                      color: active ? 'var(--admin-accent)' : 'var(--admin-text-secondary)',
                    }}
                  >
                    {METRIC_LABELS[metric]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>

        {query.isError ? (
          <ErrorState
            message={adSenseErrorMessage(query.error, 'Could not load the earnings report.')}
            onRetry={() => query.refetch()}
          />
        ) : query.isPending ? (
          <LoadingState />
        ) : !report || report.rows.length === 0 ? (
          <EmptyState title="No rows for these filters" message="Widen the date range or remove a filter." />
        ) : (
          <>
            {report.truncated ? (
              <p
                className="rounded-md px-3 py-2 text-[11px] font-medium"
                style={{ border: '1px solid var(--admin-warning, var(--color-warning))', color: 'var(--admin-warning, var(--color-warning))' }}
              >
                Showing {report.rows.length} of {report.totalMatchedRows ?? 'more'} rows. The result was cut short by the
                row limit ({DEFAULT_REPORT_LIMIT}), so the totals below are partial.
              </p>
            ) : null}

            {totals ? (
              <div className="flex flex-wrap gap-3">
                {Object.entries(totals).map(([name, value]) => (
                  <div
                    key={name}
                    className="rounded-md px-3 py-2"
                    style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)' }}
                  >
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                      {METRIC_LABELS[name as AdSenseMetric] ?? name}
                    </p>
                    <p className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                      {adSenseMetricKind(name) === 'currency'
                        ? formatAdSenseCurrency(parseAdSenseNumber(value), currencyCode)
                        : formatAdSenseCell(name, value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
                <thead>
                  {/* Headers come from `columns`, not the requested metrics — AdSense may return fewer. */}
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    {report.columns.map((column) => (
                      <th
                        key={column.name}
                        scope="col"
                        className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide"
                        style={{ color: 'var(--admin-text-muted)' }}
                      >
                        {DIMENSION_LABELS[column.name as AdSenseDimension] ?? METRIC_LABELS[column.name as AdSenseMetric] ?? column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      {report.columns.map((column) => {
                        // Rows are keyed by column name, so order does not matter.
                        const value = row[column.name];
                        const isDimension = column.type === 'DIMENSION';
                        return (
                          <td
                            key={column.name}
                            className="px-2 py-1.5"
                            style={{
                              color: isDimension ? 'var(--admin-text-secondary)' : 'var(--admin-text)',
                              fontFamily: isDimension ? undefined : 'var(--font-mono)',
                            }}
                          >
                            {isDimension ? value || '—' : formatAdSenseCell(column.name, value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
              {formatAdSenseCount(String(report.rows.length))} rows
              {report.totalMatchedRows !== null ? ` · ${formatAdSenseCount(String(report.totalMatchedRows))} matched` : ''}.
            </p>
          </>
        )}
      </div>
    </CardPanel>
  );
}