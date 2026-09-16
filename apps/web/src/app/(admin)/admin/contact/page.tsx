'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Inbox } from 'lucide-react';
import {
  AdminMenu,
  AdminPageHeader,
  AdminSelect,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../../../components/admin/AdminShared';
import {
  fetchContactSubmissions,
  updateContactStatus,
  type ContactSubmission,
} from '../../../../services/contact';

function formatWhen(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminContactPage() {
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState('');

  const load = () => {
    setLoading(true);
    setError(false);
    fetchContactSubmissions(status ? { status } : {})
      .then((res) => setItems(res.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const setItemStatus = async (item: ContactSubmission, next: 'new' | 'read' | 'resolved') => {
    try {
      const updated = await updateContactStatus(item.id, next);
      setItems((list) => list.map((row) => (row.id === item.id ? updated : row)));
      toast.success('Status updated.');
    } catch {
      toast.error('Could not update status.');
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Contact" subtitle="Messages sent from the public contact form." />

      <div
        className="flex flex-wrap items-center gap-2 rounded-lg p-3"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="w-40">
          <AdminSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="resolved">Resolved</option>
          </AdminSelect>
        </div>
        <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          {items.length} message{items.length === 1 ? '' : 's'}
        </p>
      </div>

      {loading ? (
        <LoadingState variant="table" />
      ) : error ? (
        <ErrorState message="Could not load submissions." onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title="No messages" message="Contact form submissions will appear here." />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>From</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Message</th>
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider md:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{item.name}</p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>{item.email}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="max-w-md whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--admin-text-secondary)' }}>
                        {item.message}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 align-top text-xs md:table-cell" style={{ color: 'var(--admin-text-muted)' }}>
                      {formatWhen(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="ml-auto flex items-center justify-end gap-1.5">
                        <StatusBadge status={item.status} />
                        <AdminMenu
                          label="Change message status"
                          value={item.status}
                          onChange={(next) => void setItemStatus(item, next as 'new' | 'read' | 'resolved')}
                          options={[
                            { value: 'new', label: 'New' },
                            { value: 'read', label: 'Read' },
                            { value: 'resolved', label: 'Resolved' },
                          ]}
                        />
                      </div>
                    </td>
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
