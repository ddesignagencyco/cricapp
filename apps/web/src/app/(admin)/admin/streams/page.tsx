'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AdminInput, AdminPageHeader, AdminSelect, EmptyState, ErrorState, LoadingState } from '../../../../components/admin/AdminShared';
import AdminPagination from '../../../../components/admin/AdminPagination';
import { createStream, deleteStream, fetchStreamsPage, updateStream, type StreamInput } from '../../../../services/streams';
import type { Stream } from '../../../../types/index';

const emptyForm: StreamInput = {
  title: '',
  streamUrl: '',
  provider: '',
  thumbnailUrl: '',
  matchId: '',
  status: 'upcoming',
};

export default function AdminStreamsPage() {
  const [items, setItems] = useState<Stream[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<StreamInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = (nextPage = page) => {
    setLoading(true);
    fetchStreamsPage({ page: nextPage, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
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

  const remove = async (id: string) => {
    try {
      await deleteStream(id);
      setItems((list) => list.filter((item) => item.id !== id));
      toast.success('Stream deleted.');
    } catch {
      toast.error('Could not delete the stream.');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Live streams" subtitle="Create and update public stream embeds using POST/PATCH/DELETE /streams." />

      <form onSubmit={submit} className="grid gap-3 rounded-lg p-4 sm:grid-cols-2" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <AdminInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" required />
        <AdminInput value={form.streamUrl} onChange={(e) => setForm((f) => ({ ...f, streamUrl: e.target.value }))} placeholder="https://embed URL" required />
        <AdminInput value={form.provider || ''} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="Provider" />
        <AdminInput value={form.thumbnailUrl || ''} onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="Thumbnail URL" />
        <AdminInput value={form.matchId || ''} onChange={(e) => setForm((f) => ({ ...f, matchId: e.target.value }))} placeholder="Match ID (optional)" />
        <AdminSelect value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
          <option value="upcoming">upcoming</option>
          <option value="live">live</option>
          <option value="ended">ended</option>
        </AdminSelect>
        <button type="submit" disabled={saving} className="rounded-md px-3 py-2 text-xs font-bold text-white disabled:opacity-60" style={{ background: 'var(--admin-accent)' }}>
          Create stream
        </button>
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message="Could not load streams." onRetry={() => load(page)} />
      ) : items.length === 0 ? (
        <EmptyState title="No streams" message="Create a stream to show it on the public /streams page." />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((stream) => (
                <tr key={stream.id} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                  <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>{stream.title}</td>
                  <td className="px-4 py-2.5">
                    <AdminSelect value={stream.status} onChange={(e) => setStatus(stream, e.target.value)}>
                      <option value="upcoming">upcoming</option>
                      <option value="live">live</option>
                      <option value="ended">ended</option>
                    </AdminSelect>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" onClick={() => remove(stream.id)} className="text-xs font-semibold" style={{ color: 'var(--admin-danger)' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3">
            <AdminPagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={load} />
          </div>
        </div>
      )}
    </div>
  );
}
