'use client';

import { useEffect, useState } from 'react';
import { Mail, Search } from 'lucide-react';
import {
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../../../components/admin/AdminShared';
import { fetchNewsletterSubscribers, type NewsletterSubscriber } from '../../../../services/newsletter';

export default function AdminNewsletterPage() {
  const [items, setItems] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

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
      <AdminPageHeader title="Newsletter" subtitle="Email subscribers from the public signup form." />

      <div
        className="flex flex-wrap items-center gap-2 rounded-lg p-3"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="relative w-full max-w-md">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') load();
            }}
            placeholder="Search email"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
        <div className="w-36">
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
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load subscribers." onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Mail size={28} />} title="No subscribers" message="Public newsletter signups will appear here." />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="px-4 py-3 text-xs font-bold uppercase" style={{ color: 'var(--admin-text-secondary)' }}>Email</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--admin-text)' }}>{item.email}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
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
