'use client';

import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import {
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  EmptyState,
  ErrorState,
  LoadingState,
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
  }, [status]);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Newsletter" subtitle="Subscribers from POST /newsletter/subscribe." />
      <div className="flex flex-col gap-2 sm:flex-row">
        <AdminInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load();
          }}
          placeholder="Search email"
        />
        <AdminSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="unsubscribed">Unsubscribed</option>
        </AdminSelect>
        <button type="button" onClick={load} className="btn-brand rounded-md px-4 py-2 text-xs font-bold">
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
          <table className="w-full text-left text-sm">
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
                  <td className="px-4 py-3 text-xs uppercase" style={{ color: 'var(--admin-text-muted)' }}>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
