'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Radio, Trash2 } from 'lucide-react';
import {
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../../../components/admin/AdminShared';
import AdminPagination from '../../../../components/admin/AdminPagination';
import { createStream, deleteStream, fetchStreamsPage, updateStream, type StreamInput } from '../../../../services/streams';
import type { Stream } from '../../../../types/index';
import RemoteImage from '../../../../components/RemoteImage';

const emptyForm: StreamInput = {
  title: '',
  streamUrl: '',
  provider: '',
  thumbnailUrl: '',
  matchId: '',
  status: 'upcoming',
};

const LIMIT = 20;

function statusStyle(status: string) {
  if (status === 'live') return { background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' };
  if (status === 'ended') return { background: 'var(--admin-input-bg)', color: 'var(--admin-text-muted)' };
  return { background: 'var(--admin-info-bg)', color: 'var(--admin-info)' };
}

export default function AdminStreamsPage() {
  const [items, setItems] = useState<Stream[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<StreamInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = (nextPage = page) => {
    setLoading(true);
    fetchStreamsPage({ page: nextPage, limit: LIMIT })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages));
        setPage(nextPage);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.streamUrl.trim()) {
      toast.error('Title and stream URL are required.');
      return;
    }
    setSaving(true);
    try {
      await createStream({
        title: form.title.trim(),
        streamUrl: form.streamUrl.trim(),
        provider: form.provider || undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
        matchId: form.matchId || undefined,
        status: form.status || 'upcoming',
      });
      setForm(emptyForm);
      toast.success('Stream created.');
      load(1);
    } catch {
      toast.error('Could not create the stream.');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (stream: Stream, status: string) => {
    try {
      await updateStream(stream.id, { status });
      setItems((list) => list.map((item) => (item.id === stream.id ? { ...item, status } : item)));
    } catch {
      toast.error('Could not update stream status.');
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await deleteStream(deleteId);
      setItems((list) => list.filter((item) => item.id !== deleteId));
      toast.success('Stream deleted.');
    } catch {
      toast.error('Could not delete the stream.');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Live streams" subtitle="Create and update public stream embeds shown on /streams." />

      <form
        onSubmit={submit}
        className="grid gap-3 rounded-lg p-4 sm:grid-cols-2"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <AdminInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" required />
        <AdminInput value={form.streamUrl} onChange={(e) => setForm((f) => ({ ...f, streamUrl: e.target.value }))} placeholder="https://embed URL" required />
        <AdminInput value={form.provider || ''} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="Provider" />
        <AdminInput value={form.thumbnailUrl || ''} onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="Thumbnail URL" />
        <AdminInput value={form.matchId || ''} onChange={(e) => setForm((f) => ({ ...f, matchId: e.target.value }))} placeholder="Match ID (optional)" />
        <AdminSelect value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="ended">Ended</option>
        </AdminSelect>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 sm:w-fit"
          style={{ background: 'var(--admin-accent)' }}
        >
          <Plus size={15} />
          Create stream
        </button>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load streams." onRetry={() => load(page)} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Radio size={28} />} title="No streams" message="Create a stream to show it on the public /streams page." />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Stream</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Provider</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((stream) => (
                  <tr
                    key={stream.id}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {stream.image ? (
                          <RemoteImage src={stream.image} alt="" width={56} height={36} className="h-9 w-14 shrink-0 rounded object-cover" style={{ border: '1px solid var(--admin-border)' }} />
                        ) : (
                          <span className="grid h-9 w-14 shrink-0 place-items-center rounded" style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-accent)' }}>
                            <Radio size={16} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold" style={{ color: 'var(--admin-text)' }}>{stream.title}</p>
                          {stream.matchId ? (
                            <p className="truncate text-xs" style={{ color: 'var(--admin-text-muted)' }}>{stream.matchId}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--admin-text-secondary)' }}>{stream.host || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase" style={statusStyle(stream.status)}>
                          {stream.status}
                        </span>
                        <AdminSelect value={stream.status} onChange={(e) => setStatus(stream, e.target.value)}>
                          <option value="upcoming">Upcoming</option>
                          <option value="live">Live</option>
                          <option value="ended">Ended</option>
                        </AdminSelect>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setDeleteId(stream.id)}
                          className="grid h-8 w-8 place-items-center rounded-md"
                          style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
                          aria-label="Delete stream"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end px-4 py-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <AdminPagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={load} />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete stream"
        message="This removes the stream from the public streams page."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={remove}
      />
    </div>
  );
}
