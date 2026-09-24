'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Clock3, Database, RefreshCw, Scale } from 'lucide-react';
import {
  AdminChip,
  AdminPageHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
} from '../../../../components/admin/AdminShared';
import { isOddsSeedSource } from '../../../../lib/oddsDisplay';
import { fetchAdminOddsSourceHealth } from '../../../../services/odds';
import type { OddsSourceHealthResponse } from '../../../../types/odds';

export default function AdminOddsPage() {
  const [health, setHealth] = useState<OddsSourceHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await fetchAdminOddsSourceHealth();
      setHealth(response);
      setCheckedAt(new Date());
    } catch {
      setError('Could not load odds source health.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const sources = health?.sources ?? [];
  const activeCount = sources.filter((source) => source.isActive).length;
  const staleCount = sources.filter((source) => source.stale).length;
  const seedCount = sources.filter((source) => isSeedSource(source.slug, source.name)).length;

  if (loading && !health) return <LoadingState variant="dashboard" />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        icon={<Scale size={18} />}
        title="Odds sources"
        subtitle="Monitor stored seed and live odds sources, licensing state, and stale-price detection."
        actions={(
          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold disabled:opacity-50"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text)' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} aria-hidden="true" />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        )}
      />

      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {health ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              label="Sources"
              value={sources.length}
              icon={<Database size={15} />}
              color="var(--admin-accent)"
              bgColor="var(--admin-info-bg)"
            />
            <StatCard
              label="Active"
              value={activeCount}
              icon={<Activity size={15} />}
              color="var(--admin-success)"
              bgColor="var(--admin-success-bg)"
            />
            <StatCard
              label="Stale"
              value={staleCount}
              icon={<Clock3 size={15} />}
              color="var(--admin-warning)"
              bgColor="var(--admin-warning-bg)"
            />
            <StatCard
              label="Seed sources"
              value={seedCount}
              icon={<Scale size={15} />}
              color="var(--admin-info)"
              bgColor="var(--admin-info-bg)"
              sub="Development data"
            />
          </div>

          <section
            className="overflow-hidden rounded-lg"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
          >
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              style={{ borderBottom: '1px solid var(--admin-border)' }}
            >
              <div>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Feed health</h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  Prices are stale after {health.staleAfterMinutes} minutes without a new snapshot.
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                Checked {checkedAt ? checkedAt.toLocaleTimeString() : 'just now'}
              </p>
            </div>

            {sources.length === 0 ? (
              <EmptyState
                icon={<Database size={24} />}
                title="No odds sources stored"
                message="Seeded demo sources appear after the odds seed is loaded. Live Sportradar sources appear here when the Odds Comparison feed is configured."
              />
            ) : (
              <div className="table-scroll">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                      {['Source', 'Slug', 'Mode', 'License', 'Last price', 'Health'].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: 'var(--admin-text-secondary)' }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((source) => {
                      const seed = isSeedSource(source.slug, source.name);
                      return (
                        <tr key={source.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                          <td className="px-3 py-2.5">
                            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{source.name}</p>
                            <p className="mt-0.5 font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                              {source.id}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 font-mono" style={{ color: 'var(--admin-text-secondary)' }}>
                            {source.slug}
                          </td>
                          <td className="px-3 py-2.5">
                            <AdminChip
                              label={seed ? 'Seed' : 'Live'}
                              tone={seed ? 'warning' : 'info'}
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <AdminChip
                              label={titleCase(source.licenseStatus)}
                              tone={source.licenseStatus.toLowerCase() === 'licensed' ? 'success' : 'neutral'}
                            />
                          </td>
                          <td className="px-3 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>
                            {formatTimestamp(source.lastCapturedAt)}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              <AdminChip
                                label={source.isActive ? 'Active' : 'Inactive'}
                                tone={source.isActive ? 'success' : 'neutral'}
                              />
                              <AdminChip
                                label={source.stale ? 'Stale' : 'Fresh'}
                                tone={source.stale ? 'warning' : 'success'}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function isSeedSource(slug: string, name: string): boolean {
  return isOddsSeedSource({ sourceSlug: slug, sourceName: name });
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
