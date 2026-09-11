'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Calendar,
  Loader2,
  Mail,
  Monitor,
  Search,
  Smartphone,
  Tablet,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../components/AuthProvider';
import Pagination from '../../../components/Pagination';
import {
  fetchDevices,
  fetchNotificationHistory,
  unregisterDevice,
  updateDevicePreferences,
  type NotificationDevice,
  type NotificationLogItem,
} from '../../../services/notifications';

const PREF_KEYS = [
  { key: 'matchStart', label: 'Match start', hint: 'When a followed match begins.' },
  { key: 'wicket', label: 'Wicket', hint: 'Wicket alerts from live matches.' },
  { key: 'milestone', label: 'Milestone', hint: 'Fifties, hundreds and similar marks.' },
  { key: 'matchEnd', label: 'Match end', hint: 'Result when a match is finished.' },
] as const;

function platformIcon(platform: string) {
  const value = platform.toLowerCase();
  if (value.includes('ios') || value.includes('android')) return Smartphone;
  if (value.includes('tablet')) return Tablet;
  return Monitor;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function groupLabel(iso: string) {
  const then = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  const day = 24 * 60 * 60 * 1000;
  if (then === today) return 'Today';
  if (then === today - day) return 'Yesterday';
  if (then > today - 7 * day) return 'Earlier this week';
  return 'Older';
}

function timeLabel(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function itemHref(item: NotificationLogItem): string | null {
  const data = item.data;
  if (!data) return null;
  const matchId = data.matchId;
  if (typeof matchId === 'string' && matchId) return `/matches/${matchId}`;
  const url = data.url;
  if (typeof url === 'string' && url.startsWith('/')) return url;
  return null;
}

export default function NotificationSettingsPage() {
  const { loading, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<NotificationLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [devices, setDevices] = useState<NotificationDevice[]>([]);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotificationHistory({ page, limit: 20 })
      .then((res) => {
        setHistory(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch(() => {
        setHistory([]);
        setTotal(0);
      });
  }, [isAuthenticated, page]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDevices()
      .then(setDevices)
      .catch(() => setDevices([]));
  }, [isAuthenticated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (item) => item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q)
    );
  }, [history, query]);

  const grouped = useMemo(() => {
    const order = ['Today', 'Yesterday', 'Earlier this week', 'Older'];
    const map = new Map<string, NotificationLogItem[]>();
    for (const item of filtered) {
      const label = groupLabel(item.createdAt);
      const list = map.get(label) || [];
      list.push(item);
      map.set(label, list);
    }
    return order.filter((label) => map.has(label)).map((label) => ({ label, items: map.get(label) || [] }));
  }, [filtered]);

  const todayCount = useMemo(() => {
    const today = startOfDay(new Date(now));
    return history.filter((item) => startOfDay(new Date(item.createdAt)) === today).length;
  }, [history, now]);

  const weekCount = useMemo(() => {
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return history.filter((item) => new Date(item.createdAt).getTime() >= weekAgo).length;
  }, [history, now]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-stext">Loading notifications…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="grid h-16 w-16 place-items-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/25">
          <Bell size={32} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-mtext">Sign in to manage notifications</h1>
        <p className="mt-2 max-w-md text-sm text-stext">
          View alert history and update device preferences for live match events.
        </p>
        <Link
          href="/login?returnTo=/settings/notifications"
          className="btn-brand mt-6 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold"
        >
          Sign in
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const togglePref = async (device: NotificationDevice, key: string) => {
    setBusy(true);
    try {
      const next = { ...(device.preferences || {}), [key]: !device.preferences?.[key] };
      const updated = await updateDevicePreferences(device.id, next);
      setDevices((list) => list.map((d) => (d.id === device.id ? updated : d)));
    } catch {
      toast.error('Could not update preferences.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await unregisterDevice(id);
      setDevices((list) => list.filter((d) => d.id !== id));
      toast.success('Device removed.');
    } catch {
      toast.error('Could not remove this device.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-mtext sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-stext">Stay updated on matches and account alerts.</p>
        </div>
        <a
          href="#preferences"
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-lborder bg-card px-4 py-2 text-sm font-semibold text-mtext hover:bg-elevated"
        >
          <Bell size={14} />
          Notification settings
        </a>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-md border border-lborder bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-accent">
              All
              <span className="rounded bg-accent/15 px-1.5 py-0.5">{total}</span>
            </div>
            <label className="relative block min-w-0 sm:w-64">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notifications…"
                className="w-full rounded-md border border-lborder bg-elevated py-2 pl-9 pr-3 text-sm text-mtext outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-8 rounded-md border border-dashed border-lborder bg-secondary px-4 py-12 text-center">
              <Bell size={22} className="mx-auto text-stext" />
              <p className="mt-2 text-sm text-stext">
                {query.trim() ? 'No notifications match that search.' : 'No notifications have been sent to this account yet.'}
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              {grouped.map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stext">{group.label}</p>
                  <ul className="space-y-1.5">
                    {group.items.map((item) => {
                      const href = itemHref(item);
                      return (
                        <li key={item.id} className="rounded-md border border-lborder bg-elevated px-3 py-3">
                          <div className="flex gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent/10 text-accent">
                              <Bell size={15} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-mtext">{item.title}</p>
                                <p className="shrink-0 text-[11px] text-stext">{timeLabel(item.createdAt)}</p>
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-xs text-stext">{item.body}</p>
                              {href && (
                                <Link href={href} className="mt-2 inline-flex text-xs font-semibold text-accent hover:text-accent2">
                                  Open
                                </Link>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-5">
              <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-md border border-lborder bg-card p-5">
            <h2 className="text-sm font-semibold text-mtext">Notification summary</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stext"><Mail size={14} className="text-accent" /> Total</span>
                <span className="font-semibold text-mtext">{total}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stext"><Calendar size={14} className="text-accent" /> Today</span>
                <span className="font-semibold text-mtext">{todayCount}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stext"><Bell size={14} className="text-accent" /> This week</span>
                <span className="font-semibold text-mtext">{weekCount}</span>
              </li>
            </ul>
          </div>

          <div id="preferences" className="rounded-md border border-lborder bg-card p-5">
            <h2 className="text-sm font-semibold text-mtext">Preferences</h2>
            <p className="mt-1 text-xs leading-relaxed text-stext">
              Match alert toggles are stored on registered devices. New browser registration needs a Firebase token, which this site does not collect.
            </p>
            {devices.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-lborder bg-secondary px-3 py-6 text-center text-xs text-stext">
                No registered devices.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {devices.map((device) => {
                  const Icon = platformIcon(device.platform);
                  return (
                    <li key={device.id}>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-xs font-semibold capitalize text-mtext">
                          <Icon size={14} className="text-accent" />
                          {device.platform}
                        </p>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => remove(device.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger disabled:opacity-60"
                        >
                          <Trash2 size={11} /> Remove
                        </button>
                      </div>
                      <div className="space-y-2">
                        {PREF_KEYS.map((pref) => {
                          const on = Boolean(device.preferences?.[pref.key]);
                          return (
                            <div key={pref.key} className="flex items-center justify-between gap-3 rounded-md border border-lborder bg-elevated px-3 py-2.5">
                              <div>
                                <p className="text-xs font-semibold text-mtext">{pref.label}</p>
                                <p className="text-[11px] text-stext">{pref.hint}</p>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={on}
                                disabled={busy}
                                onClick={() => togglePref(device, pref.key)}
                                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                                  on ? 'bg-accent' : 'bg-lborder'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                                    on ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
