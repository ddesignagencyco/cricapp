'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Inbox } from 'lucide-react';
import {
  AdminPageHeader,
  AdminSelect,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import {
  fetchContactSubmissions,
  updateContactStatus,
  type ContactSubmission,
} from '../../../../services/contact';

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
  }, [status]);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Contact" subtitle="Messages from POST /contact." />
      <AdminSelect value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
        <option value="">All statuses</option>
        <option value="new">New</option>
        <option value="read">Read</option>
        <option value="resolved">Resolved</option>
      </AdminSelect>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load submissions." onRetry={load} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title="No messages" message="Contact form submissions will appear here." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{item.email}</p>
                </div>
                <AdminSelect
                  value={item.status}
                  onChange={async (e) => {
                    const next = e.target.value as 'new' | 'read' | 'resolved';
                    try {
                      const updated = await updateContactStatus(item.id, next);
                      setItems((list) => list.map((row) => (row.id === item.id ? updated : row)));
                      toast.success('Status updated.');
                    } catch {
                      toast.error('Could not update status.');
                    }
                  }}
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="resolved">Resolved</option>
                </AdminSelect>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: 'var(--admin-text-secondary)' }}>{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
