'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail } from 'lucide-react';
import {
  AdminSearchField,
  AdminPageHeader,
  AdminSelect,
  AdminSortableHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  type SortDirection,
} from '../../../../components/admin/AdminShared';
import { fetchNewsletterSubscribers, type NewsletterSubscriber } from '../../../../services/newsletter';
import NewsletterCampaigns from '../../../../components/admin/NewsletterCampaigns';

export default function AdminNewsletterPage() {
  const [items, setItems] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<'email' | 'status'>('email');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');

  const toggleSort = (key: 'email' | 'status') => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const sortedItems = useMemo(() => {
    const mul = sortOrder === 'desc' ? -1 : 1;
    return [...items].sort((a, b) => {
      const av = (sortBy === 'status' ? a.status : a.email || '').toLowerCase();
      const bv = (sortBy === 'status' ? b.status : b.email || '').toLowerCase();
      return av.localeCompare(bv) * mul || a.email.localeCompare(b.email);
    });
  }, [items, sortBy, sortOrder]);

  const load = () => {
    setLoading(true);
    setError(false);
    fetchNewsletterSubscribers({ status: status || undefined, q: q.trim() || undefined })
      .then((res) => setItems(res.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Newsletter" subtitle="Send newsletters and manage subscribers from the public signup form." />

      <NewsletterCampaigns />

      <h2 className="pt-2 text-base font-bold" style={{ color: 'var(--admin-text)' }}>Subscribers</h2>

      <div
        className="flex flex-wrap items-center gap-2 rounded-lg p-3"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <AdminSearchField
          wrapperClassName="max-w-md"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email"
        />
        <div className="w-full shrink-0 sm:w-36">
          <AdminSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
          </AdminSelect>
        </div>
        <button type="button" onClick={load} className="btn-brand rounded-md px-3 py-2 text-xs font-bold">
          Search
        </button>
      </div>

      {loading ? (
        <LoadingState variant="table" />
      ) : error ? (
        <ErrorState message="Could not load subscribers." onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Mail size={28} />} title="No subscribers" message="Public newsletter signups will appear here." />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                  <AdminSortableHeader label="Email" sortKey="email" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} className="px-4 py-3 text-xs font-bold uppercase" />
                  <AdminSortableHeader label="Status" sortKey="status" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} className="px-4 py-3 text-xs font-bold uppercase" />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="max-w-[11rem] truncate px-4 py-3 sm:max-w-none" style={{ color: 'var(--admin-text)' }} title={item.email}>{item.email}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
