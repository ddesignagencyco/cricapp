'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Pencil, Plus, Radio, Trash2, X } from 'lucide-react';
import {
  AdminField,
  AdminIconButton,
  AdminInput,
  AdminMenu,
  AdminPageHeader,
  AdminSelect,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../../../components/admin/AdminShared';
import AdminPagination from '../../../../components/admin/AdminPagination';
import { createStream, deleteStream, fetchStreamsPage, updateStream, type StreamInput } from '../../../../services/streams';
import Badge from '../../../../components/Badge';
import type { Stream } from '../../../../types/index';
import RemoteImage from '../../../../components/RemoteImage';
import {
  CUSTOM_PROVIDER,
  STREAM_PROVIDERS,
  inferStreamFromUrl,
  fetchStreamTitle,
  providerChoiceFromName,
  type StreamProviderChoice,
} from '../../../../utils/streamEmbed';

const emptyForm: StreamInput = {
  title: '',
  streamUrl: '',
  provider: '',
  thumbnailUrl: '',
  matchId: '',
  status: 'upcoming',
};

const LIMIT = 20;

function resolvedProvider(choice: StreamProviderChoice, customName: string): string | undefined {
  if (choice === CUSTOM_PROVIDER) return customName.trim() || undefined;
  return choice || undefined;
}

export default function AdminStreamsPage() {
  const [items, setItems] = useState<Stream[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<StreamInput>(emptyForm);
  const [providerChoice, setProviderChoice] = useState<StreamProviderChoice>('');
  const [customProvider, setCustomProvider] = useState('');
  const [autoThumb, setAutoThumb] = useState('');
  const autoTitleRef = useRef('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setForm(emptyForm);
    setProviderChoice('');
    setCustomProvider('');
    setAutoThumb('');
    autoTitleRef.current = '';
    setEditingId(null);
  };

  const applyUrl = (url: string) => {
    const inferred = inferStreamFromUrl(url);
    setForm((current) => {
      const keepThumb = Boolean(current.thumbnailUrl && current.thumbnailUrl !== autoThumb);
      return {
        ...current,
        streamUrl: url,
        thumbnailUrl: keepThumb ? current.thumbnailUrl : inferred.thumbnailUrl || current.thumbnailUrl,
        provider:
          providerChoice === CUSTOM_PROVIDER
            ? current.provider
            : inferred.provider || current.provider,
      };
    });
    if (inferred.thumbnailUrl) setAutoThumb(inferred.thumbnailUrl);
    if (inferred.provider && providerChoice !== CUSTOM_PROVIDER) {
      setProviderChoice(inferred.provider as StreamProviderChoice);
    }
  };

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

  useEffect(() => {
    const url = form.streamUrl.trim();
    const inferred = inferStreamFromUrl(url);
    if (!url || !inferred.thumbnailUrl) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchStreamTitle(url, controller.signal).then((title) => {
        if (!title) return;
        setForm((current) => {
          const keep = Boolean(current.title && current.title !== autoTitleRef.current);
          if (keep) return current;
          return { ...current, title };
        });
        autoTitleRef.current = title;
      });
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [form.streamUrl]);

  const startEdit = (stream: Stream) => {
    const url = stream.embedUrl || '';
    const provider = stream.host || '';
    const choice = providerChoiceFromName(provider);
    const inferred = inferStreamFromUrl(url);
    setEditingId(stream.id);
    setProviderChoice(choice);
    setCustomProvider(choice === CUSTOM_PROVIDER ? provider : '');
    setAutoThumb(inferred.thumbnailUrl);
    autoTitleRef.current = '';
    setForm({
      title: stream.title || '',
      streamUrl: url,
      provider,
      thumbnailUrl: stream.image || '',
      matchId: stream.matchId || '',
      status: stream.status || 'upcoming',
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing: string[] = [];
    if (!form.title.trim()) missing.push('Title');
    if (!form.streamUrl.trim()) missing.push('Stream URL');
    if (providerChoice === CUSTOM_PROVIDER && !customProvider.trim()) missing.push('Custom provider');
    if (missing.length) {
      toast.error(`${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required.`);
      return;
    }
    const provider = resolvedProvider(providerChoice, customProvider);
    setSaving(true);
    const payload: StreamInput = {
      title: form.title.trim(),
      streamUrl: form.streamUrl.trim(),
      provider,
      thumbnailUrl: form.thumbnailUrl?.trim() || undefined,
      matchId: form.matchId || undefined,
      status: form.status || 'upcoming',
    };
    try {
      if (editingId) {
        const updated = await updateStream(editingId, payload);
        setItems((list) =>
          list.map((item) =>
            item.id === editingId
              ? {
                  ...item,
                  ...updated,
                  title: payload.title,
                  embedUrl: payload.streamUrl,
                  host: payload.provider,
                  image: payload.thumbnailUrl,
                  matchId: payload.matchId,
                  status: payload.status || item.status,
                }
              : item,
          ),
        );
        toast.success('Stream updated.');
      } else {
        await createStream(payload);
        toast.success('Stream created.');
        load(1);
      }
      resetForm();
    } catch {
      toast.error(editingId ? 'Could not update the stream.' : 'Could not create the stream.');
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
      if (editingId === deleteId) resetForm();
      toast.success('Stream deleted.');
    } catch {
      toast.error('Could not delete the stream.');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Live streams"
        subtitle="Create and update public stream embeds shown on /streams."
      />

      <form
        onSubmit={submit}
        noValidate
        className="rounded-lg p-4"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
            {editingId ? 'Edit stream' : 'New stream'}
          </p>
          {editingId ? (
            <span className="truncate text-xs font-semibold" style={{ color: 'var(--admin-text-muted)' }}>
              {form.title || 'Untitled'}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <AdminField label="Title" required>
              <AdminInput
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="PSL final — live stream"
                required
              />
            </AdminField>
          </div>
          <div className="md:col-span-3">
            <AdminField label="Provider">
              <AdminSelect
                value={providerChoice}
                onChange={(e) => {
                  const next = e.target.value as StreamProviderChoice;
                  setProviderChoice(next);
                  setForm((f) => ({
                    ...f,
                    provider: next === CUSTOM_PROVIDER ? customProvider : next,
                  }));
                }}
              >
                <option value="">Select provider</option>
                {STREAM_PROVIDERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value={CUSTOM_PROVIDER}>Custom</option>
              </AdminSelect>
            </AdminField>
          </div>
          <div className="md:col-span-3">
            <AdminField label="Status">
              <AdminSelect value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
              </AdminSelect>
            </AdminField>
          </div>
          {providerChoice === CUSTOM_PROVIDER ? (
            <div className="md:col-span-12">
              <AdminField label="Custom provider" required>
                <AdminInput
                  value={customProvider}
                  onChange={(e) => {
                    setCustomProvider(e.target.value);
                    setForm((f) => ({ ...f, provider: e.target.value }));
                  }}
                  placeholder="e.g. Tamasha, A Sports"
                />
              </AdminField>
            </div>
          ) : null}

          <div className="md:col-span-12">
            <AdminField label="Stream URL" required hint="Paste a watch or embed link. Provider and thumbnail fill automatically when possible.">
              <AdminInput
                value={form.streamUrl}
                onChange={(e) => applyUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                required
              />
            </AdminField>
          </div>

          <div className="md:col-span-8">
            <AdminField label="Thumbnail">
              <div className="flex items-stretch gap-2">
                {form.thumbnailUrl ? (
                  <RemoteImage
                    src={form.thumbnailUrl}
                    alt=""
                    width={56}
                    height={36}
                    className="w-14 shrink-0 self-stretch rounded-md object-cover"
                    style={{ border: '1px solid var(--admin-border)' }}
                  />
                ) : (
                  <span
                    className="grid w-14 shrink-0 place-items-center self-stretch rounded-md"
                    style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-accent)', border: '1px solid var(--admin-border)' }}
                  >
                    <Radio size={14} />
                  </span>
                )}
                <AdminInput
                  value={form.thumbnailUrl || ''}
                  onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
            </AdminField>
          </div>
          <div className="md:col-span-4">
            <AdminField label="Match ID">
              <AdminInput
                value={form.matchId || ''}
                onChange={(e) => setForm((f) => ({ ...f, matchId: e.target.value }))}
                placeholder="sr:match:…"
              />
            </AdminField>
          </div>
        </div>

        <div
          className="mt-4 flex flex-wrap items-center justify-end gap-2 pt-4"
          style={{ borderTop: '1px solid var(--admin-border)' }}
        >
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-semibold"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            >
              <X size={14} />
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="btn-brand inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-bold disabled:opacity-60"
          >
            {editingId ? <Check size={15} /> : <Plus size={15} />}
            {editingId ? 'Save changes' : 'Create stream'}
          </button>
        </div>
      </form>

      {loading ? (
        <LoadingState variant="table" />
      ) : error ? (
        <ErrorState message="Could not load streams." onRetry={() => load(page)} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Radio size={28} />} title="No streams" message="Create a stream to show it on the public /streams page." />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
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
                      {stream.status === 'ended' ? <Badge>Ended</Badge> : <StatusBadge status={stream.status} />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <AdminIconButton label="Edit stream" tone="accent" onClick={() => startEdit(stream)}>
                          <Pencil size={16} />
                        </AdminIconButton>
                        <AdminMenu
                          label="Change stream status"
                          value={stream.status}
                          onChange={(status) => setStatus(stream, status)}
                          options={[
                            { value: 'upcoming', label: 'Upcoming' },
                            { value: 'live', label: 'Live' },
                            { value: 'ended', label: 'Ended' },
                          ]}
                        />
                        <AdminIconButton label="Delete stream" tone="danger" onClick={() => setDeleteId(stream.id)}>
                          <Trash2 size={16} />
                        </AdminIconButton>
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
