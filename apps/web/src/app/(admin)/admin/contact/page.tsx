'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Inbox, Mail, X } from 'lucide-react';
import {
  AdminAvatar,
  AdminPageHeader,
  AdminResultCount,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
} from '../../../../components/admin/AdminShared';
import AdminPagination from '../../../../components/admin/AdminPagination';
import {
  fetchContactSubmissions,
  updateContactStatus,
  type ContactSubmission,
} from '../../../../services/contact';

const LIMIT = 20;

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'read', label: 'Read' },
  { key: 'resolved', label: 'Resolved' },
] as const;

type ContactStatus = 'new' | 'read' | 'resolved';
type StatusFilter = (typeof STATUS_FILTERS)[number]['key'];

function formatWhen(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isContactStatus(value: string): value is ContactStatus {
  return value === 'new' || value === 'read' || value === 'resolved';
}

function confirmCopy(item: ContactSubmission, next: ContactStatus) {
  const who = item.name || item.email;
  switch (next) {
    case 'new':
      return {
        title: `Mark ${who} as new?`,
        message: 'This message goes back to the new inbox.',
        confirmLabel: 'Mark new',
        danger: false,
      };
    case 'read':
      return {
        title: `Mark ${who} as read?`,
        message: 'This marks the message as seen. You can still resolve it later.',
        confirmLabel: 'Mark read',
        danger: false,
      };
    case 'resolved':
      return {
        title: `Resolve ${who}?`,
        message: 'This closes the message as handled.',
        confirmLabel: 'Resolve',
        danger: false,
      };
    default: {
      const _never: never = next;
      throw new Error(`Unhandled contact status: ${String(_never)}`);
    }
  }
}

export default function AdminContactPage() {
  const [items, setItems] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ item: ContactSubmission; next: ContactStatus } | null>(null);

  const load = (nextPage = page, nextStatus = status) => {
    setLoading(true);
    setError(false);
    fetchContactSubmissions({
      page: nextPage,
      limit: LIMIT,
      ...(nextStatus ? { status: nextStatus } : {}),
    })
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
    load(1, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const setItemStatus = async (item: ContactSubmission, next: ContactStatus) => {
    setBusyId(item.id);
    try {
      const updated = await updateContactStatus(item.id, next);
      setItems((list) => list.map((row) => (row.id === item.id ? updated : row)));
      toast.success('Status updated.');
    } catch {
      toast.error('Could not update status.');
    } finally {
      setBusyId(null);
      setPending(null);
    }
  };

  const openItem = items.find((item) => item.id === openId) || null;
  const confirm = pending ? confirmCopy(pending.item, pending.next) : null;
  const otherStatuses = (current: string): ContactStatus[] =>
    (['new', 'read', 'resolved'] as const).filter((value) => value !== current);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Contact" subtitle="Messages sent from the public contact form." />

      <div
        className="flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.key || 'all'}
              type="button"
              onClick={() => setStatus(item.key)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: status === item.key ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: status === item.key ? 'var(--color-brand-fg)' : 'var(--admin-text-secondary)',
                border: status === item.key ? 'none' : '1px solid var(--admin-border)',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <AdminResultCount shown={items.length} total={total} noun="messages" />
      </div>

      {loading ? (
        <LoadingState variant="table" />
      ) : error ? (
        <ErrorState message="Could not load submissions." onRetry={() => load(page, status)} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title="No messages" message="Contact form submissions will appear here." />
      ) : (
        <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead>
                <tr style={{ background: 'var(--admin-table-header)', borderBottom: '1px solid var(--admin-border)' }}>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>From</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Message</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const busy = busyId === item.id;
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <AdminAvatar name={item.name || item.email} size={32} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold" style={{ color: 'var(--admin-text)' }}>{item.name || '—'}</p>
                            <a
                              href={`mailto:${item.email}`}
                              className="mt-0.5 inline-flex items-center gap-1 truncate text-xs hover:underline"
                              style={{ color: 'var(--admin-accent)' }}
                            >
                              <Mail size={11} />
                              {item.email}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <button
                          type="button"
                          onClick={() => setOpenId(item.id)}
                          className="max-w-md text-left text-sm leading-relaxed"
                          style={{ color: 'var(--admin-text-secondary)' }}
                        >
                          <span className="line-clamp-2 whitespace-pre-wrap">{item.message}</span>
                          <span className="mt-1 block text-[11px] font-bold" style={{ color: 'var(--admin-accent)' }}>
                            Open message
                          </span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                        {formatWhen(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {otherStatuses(item.status).map((next) => (
                            <button
                              key={next}
                              type="button"
                              disabled={busy}
                              onClick={() => setPending({ item, next })}
                              className="rounded-md px-2.5 py-1.5 text-xs font-semibold capitalize disabled:opacity-50"
                              style={{
                                border: '1px solid var(--admin-border)',
                                color: 'var(--admin-text-secondary)',
                                background: 'var(--admin-input-bg)',
                              }}
                            >
                              {next}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end px-4 py-3" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <AdminPagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={LIMIT}
              onPageChange={(next) => load(next, status)}
            />
          </div>
        </div>
      )}

      {openItem ? (
        <div
          className="scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-message-title"
        >
          <div
            className="w-full max-w-lg rounded-lg p-5"
            style={{ background: 'var(--admin-card)', boxShadow: 'var(--elevation-overlay)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <AdminAvatar name={openItem.name || openItem.email} size={36} />
                <div className="min-w-0">
                  <h3 id="contact-message-title" className="truncate text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
                    {openItem.name || 'Message'}
                  </h3>
                  <a href={`mailto:${openItem.email}`} className="text-xs hover:underline" style={{ color: 'var(--admin-accent)' }}>
                    {openItem.email}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="grid h-8 w-8 place-items-center rounded-md"
                style={{ color: 'var(--admin-text-secondary)', border: '1px solid var(--admin-border)' }}
                aria-label="Close message"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={openItem.status} />
              <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{formatWhen(openItem.createdAt)}</p>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--admin-text)' }}>
              {openItem.message}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-1.5">
              {otherStatuses(openItem.status).map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={busyId === openItem.id}
                  onClick={() => setPending({ item: openItem, next })}
                  className="rounded-md px-3 py-1.5 text-xs font-bold capitalize disabled:opacity-50"
                  style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
                >
                  Mark {next}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pending && confirm)}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel || 'Confirm'}
        danger={confirm?.danger || false}
        loading={Boolean(pending && busyId === pending.item.id)}
        onCancel={() => {
          if (busyId) return;
          setPending(null);
        }}
        onConfirm={() => {
          if (!pending || !isContactStatus(pending.next)) return;
          void setItemStatus(pending.item, pending.next);
        }}
      />
    </div>
  );
}
