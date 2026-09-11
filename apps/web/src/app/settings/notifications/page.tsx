'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, Loader2, Monitor, Smartphone, Tablet, Trash2 } from 'lucide-react';
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
  { key: 'matchStart', label: 'Match start' },
  { key: 'wicket', label: 'Wicket' },
  { key: 'milestone', label: 'Milestone' },
  { key: 'matchEnd', label: 'Match end' },
] as const;

function platformIcon(platform: string) {
  const value = platform.toLowerCase();
  if (value.includes('ios') || value.includes('android')) return Smartphone;
  if (value.includes('tablet')) return Tablet;
  return Monitor;
}

export default function NotificationSettingsPage() {
  const { loading, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<NotificationLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [devices, setDevices] = useState<NotificationDevice[]>([]);
  const [busy, setBusy] = useState(false);

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
      <header className="relative mb-6 overflow-hidden rounded-md border border-lborder bg-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Match alerts</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext sm:text-3xl">Notifications</h1>
            <p className="mt-1 max-w-2xl text-sm text-stext">
              History and device preferences for match alerts.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-md border border-lborder bg-secondary px-4 py-2.5 text-center">
              <p className="text-lg font-semibold text-mtext">{devices.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stext">Devices</p>
            </div>
            <div className="rounded-md border border-lborder bg-secondary px-4 py-2.5 text-center">
              <p className="text-lg font-semibold text-mtext">{total}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stext">Alerts</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-md border border-lborder bg-card p-5 sm:p-6 lg:col-span-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mtext">
            <Bell size={15} className="text-accent" />
            Devices
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-stext">
            New browser registration needs a Firebase Cloud Messaging token, which this site does not collect. Existing devices can still change preferences or be removed.
          </p>
          {devices.length === 0 ? (
            <div className="mt-6 rounded-md border border-dashed border-lborder bg-secondary px-4 py-8 text-center">
              <Monitor size={22} className="mx-auto text-stext" />
              <p className="mt-2 text-sm text-stext">No registered devices.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {devices.map((device) => {
                const Icon = platformIcon(device.platform);
                return (
                  <li key={device.id} className="rounded-md border border-lborder bg-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon size={16} className="shrink-0 text-accent" />
                        <p className="truncate text-sm font-semibold capitalize text-mtext">{device.platform}</p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(device.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-danger disabled:opacity-60"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {PREF_KEYS.map((pref) => (
                        <button
                          key={pref.key}
                          type="button"
                          disabled={busy}
                          onClick={() => togglePref(device, pref.key)}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            device.preferences?.[pref.key]
                              ? 'bg-accent/15 text-accent'
                              : 'border border-lborder bg-card text-stext'
                          }`}
                        >
                          {pref.label}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-lborder bg-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-mtext">History</h2>
          {history.length === 0 ? (
            <div className="mt-6 rounded-md border border-dashed border-lborder bg-secondary px-4 py-12 text-center">
              <Bell size={22} className="mx-auto text-stext" />
              <p className="mt-2 text-sm text-stext">No notifications have been sent to this account yet.</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-lborder">
              {history.map((item) => (
                <li key={item.id} className="py-3.5 first:pt-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-mtext">{item.title}</p>
                    <p className="text-[11px] text-stext">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-stext">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
