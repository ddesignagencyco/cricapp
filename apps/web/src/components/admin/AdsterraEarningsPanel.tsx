'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, RefreshCw } from 'lucide-react';
import { apiGet } from '../../services/api/client';
import { authHeaders } from '../../services/auth';
import { CardHeader, CardPanel, EmptyState, ErrorState, LoadingState } from './AdminShared';

type AdsterraStatRow = {
  date?: string;
  impression?: number;
  clicks?: number;
  ctr?: number;
  cpm?: number;
  revenue?: number;
};

type AdsterraStatsResponse = {
  configured: boolean;
  startDate?: string;
  finishDate?: string;
  items: AdsterraStatRow[];
  totals: {
    impression: number;
    clicks: number;
    revenue: number;
    ctr: number;
    cpm: number;
  };
};

type RangePreset = '7d' | '30d' | 'month';

function computeDates(preset: RangePreset): { startDate: string; finishDate: string } {
  const now = new Date();
  const finishDate = now.toISOString().slice(0, 10);
  if (preset === '7d') {
    return {
      startDate: new Date(now.getTime() - 6 * 86400_000).toISOString().slice(0, 10),
      finishDate,
    };
  }
  if (preset === 'month') {
    return {
      startDate: `${finishDate.slice(0, 7)}-01`,
      finishDate,
    };
  }
  return {
    startDate: new Date(now.getTime() - 29 * 86400_000).toISOString().slice(0, 10),
    finishDate,
  };
}

export default function AdsterraEarningsPanel() {
  const [preset, setPreset] = useState<RangePreset>('30d');
  const { startDate, finishDate } = computeDates(preset);

  const query = useQuery({
    queryKey: ['admin-adsterra-stats', startDate, finishDate],
    queryFn: () =>
      apiGet<AdsterraStatsResponse>(
        `/admin/adsense/adsterra-stats?startDate=${startDate}&finishDate=${finishDate}`,
        undefined,
        { headers: authHeaders() },
      ),
  });

  if (query.isPending) return <LoadingState variant="table" />;
  if (query.isError) {
    return (
      <ErrorState
        message="Could not load Adsterra statistics."
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  if (!data?.configured) {
    return (
      <CardPanel>
        <div className="p-4">
          <EmptyState
            icon={<BarChart3 size={28} />}
            title="Adsterra statistics API is not configured"
            message="Set ADSTERRA_API_KEY in the API service environment (from your Adsterra Dashboard → API section) to view live impressions, clicks, CTR, CPM and revenue here."
          />
        </div>
      </CardPanel>
    );
  }

  const totals = data.totals;
  const rows = [...data.items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <CardPanel>
      <CardHeader
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {(['7d', '30d', 'month'] as RangePreset[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                className="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
                style={{
                  background: preset === key ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                  color: preset === key ? '#fff' : 'var(--admin-text-secondary)',
                  border: '1px solid var(--admin-border)',
                }}
              >
                {key === '7d' ? 'Last 7 days' : key === '30d' ? 'Last 30 days' : 'This month'}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{
                border: '1px solid var(--admin-border)',
                background: 'var(--admin-card)',
                color: 'var(--admin-text)',
              }}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        }
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
            Adsterra statistics
          </h3>
          <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {startDate} to {finishDate}
          </p>
        </div>
      </CardHeader>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
        {[
          { label: 'Revenue', value: `$${totals.revenue.toFixed(2)}` },
          { label: 'Impressions', value: totals.impression.toLocaleString() },
          { label: 'Clicks', value: totals.clicks.toLocaleString() },
          { label: 'CTR', value: `${totals.ctr.toFixed(2)}%` },
          { label: 'Avg CPM', value: `$${totals.cpm.toFixed(3)}` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg p-3"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)' }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
              {stat.label}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="px-4 pb-5">
          <EmptyState
            icon={<BarChart3 size={24} />}
            title="No Adsterra traffic in this range"
            message="Stats appear once Adsterra records impressions on your domain."
          />
        </div>
      ) : (
        <div className="table-scroll border-t" style={{ borderColor: 'var(--admin-border)' }}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                <th className="px-4 py-2.5 font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Impressions</th>
                <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Clicks</th>
                <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>CTR</th>
                <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>CPM</th>
                <th className="px-4 py-2.5 text-right font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.date || idx} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--admin-text)' }}>{row.date || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--admin-text-secondary)' }}>
                    {Number(row.impression || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--admin-text-secondary)' }}>
                    {Number(row.clicks || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--admin-text-secondary)' }}>
                    {Number(row.ctr || 0).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--admin-text-secondary)' }}>
                    ${Number(row.cpm || 0).toFixed(3)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums" style={{ color: 'var(--admin-text)' }}>
                    ${Number(row.revenue || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardPanel>
  );
}
