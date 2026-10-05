'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Mail, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscribeNewsletter } from '../services/newsletter';
import { requestNotificationPermission } from '../services/notifications';
import { ApiError } from '../services/api/client';

export const NEWSLETTER_MODAL_STORAGE_KEY = 'pcz-newsletter-modal';
export const NOTIFICATION_PROMPT_STORAGE_KEY = 'pcz-notification-prompt';
/** Delay after page load before a first-time visitor is invited. */
export const NEWSLETTER_MODAL_DELAY_MS = 4000;
/** A dismissal snoozes the popup; a subscription silences it forever. */
export const NEWSLETTER_MODAL_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

type StoredState = { status: 'subscribed' | 'dismissed'; at: number };

function readStoredState(): StoredState | null {
  try {
    const raw = window.localStorage.getItem(NEWSLETTER_MODAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    if ((parsed.status === 'subscribed' || parsed.status === 'dismissed') && typeof parsed.at === 'number') {
      return { status: parsed.status, at: parsed.at };
    }
    return null;
  } catch {
    return null;
  }
}

/** Pure eligibility check — exported for tests. */
export function shouldShowNewsletterModal(stored: StoredState | null, now: number): boolean {
  if (!stored) return true;
  if (stored.status === 'subscribed') return false;
  return now - stored.at >= NEWSLETTER_MODAL_SNOOZE_MS;
}

function persist(status: StoredState['status']): void {
  try {
    window.localStorage.setItem(NEWSLETTER_MODAL_STORAGE_KEY, JSON.stringify({ status, at: Date.now() }));
  } catch {
    // Private mode etc: the modal simply may reappear next visit. Never breaks the page.
  }
}

/** True when the browser has no Notification API at all. */
export function notificationsUnsupported(): boolean {
  return typeof window === 'undefined' || !('Notification' in window);
}

/**
 * Never re-ask a visitor who already answered.
 *
 * Browsers only allow `Notification.requestPermission()` from a user gesture
 * anyway, so this only decides whether to *offer* the button — the request
 * itself always happens on click.
 */
export function shouldOfferNotificationOptIn(): boolean {
  if (notificationsUnsupported()) return false;
  try {
    if (Notification.permission !== 'default') return false;
    return !window.localStorage.getItem(NOTIFICATION_PROMPT_STORAGE_KEY);
  } catch {
    return false;
  }
}

function rememberNotificationAnswer(): void {
  try {
    window.localStorage.setItem(NOTIFICATION_PROMPT_STORAGE_KEY, String(Date.now()));
  } catch {
    // Non-fatal: worst case the visitor sees the offer again later.
  }
}

/**
 * First-visit newsletter invite + optional alert opt-in (nag-free).
 *
 * - mounts nothing until the delay elapses, and code-splits via
 *   `dynamic(..., { ssr: false })` at the call site, so the homepage critical
 *   path pays nothing for visitors who never see it;
 * - shows once per visitor: a subscription silences it forever, a dismissal
 *   snoozes it for 30 days (fresh profile / cleared cache → shows again);
 * - dismissible via close button, backdrop click, and Escape; autofocuses the
 *   email field and uses `role="dialog"` for assistive tech;
 * - the browser alert prompt is offered as a *secondary* button and only ever
 *   requested on click, never auto-triggered, so it cannot be mistaken for a
 *   deceptive interstitial.
 */
export default function NewsletterModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [offerAlerts, setOfferAlerts] = useState(false);
  const [alertsOn, setAlertsOn] = useState(false);
  const [alertsBusy, setAlertsBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!shouldShowNewsletterModal(readStoredState(), Date.now())) return;
    // Decided before the delay so the offer is known when the modal appears.
    setOfferAlerts(shouldOfferNotificationOptIn());
    const timer = window.setTimeout(() => setOpen(true), NEWSLETTER_MODAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, [open ]);

  const dismiss = useCallback(() => {
    persist('dismissed');
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  const enableAlerts = async () => {
    setAlertsBusy(true);
    try {
      const result = await requestNotificationPermission();
      rememberNotificationAnswer();
      if (result === 'granted') {
        setAlertsOn(true);
        setOfferAlerts(false);
        toast.success('Browser alerts enabled.');
      } else if (result === 'denied') {
        setOfferAlerts(false);
        // Never re-prompt a blocked visitor — they must change browser settings.
        toast.error('Alerts are blocked in this browser. Enable them in site settings to receive alerts.');
      } else if (result === 'unsupported') {
        setOfferAlerts(false);
        toast.error('This browser does not support notifications.');
      }
    } catch {
      rememberNotificationAnswer();
      setOfferAlerts(false);
    } finally {
      setAlertsBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter your email.');
      return;
    }
    setBusy(true);
    try {
      const res = await subscribeNewsletter(email.trim());
      persist('subscribed');
      setDone(true);
      toast.success(res.message || 'Subscription confirmed.');
      closeTimer.current = window.setTimeout(() => setOpen(false), 2200);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not subscribe.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-modal-title"
      className="fixed inset-0 z-[75] grid place-items-center overflow-y-auto bg-black/60 p-4"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-card ring-1 ring-lborder"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close newsletter invite"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-stext transition-colors hover:bg-secondary hover:text-mtext"
        >
          <X size={16} />
        </button>

        <div className="p-6 sm:p-7">
          {done ? (
            <div className="py-4 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent">
                <Mail size={22} />
              </div>
              <h2 id="newsletter-modal-title" className="mt-4 text-lg font-bold text-mtext">
                You&apos;re on the list!
              </h2>
              <p className="mt-1 text-sm text-stext">Match updates and top stories, straight to your inbox.</p>
            </div>
          ) : (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent">
                <Mail size={22} />
              </div>
              <h2 id="newsletter-modal-title" className="mt-4 text-center text-lg font-bold text-mtext">
                Stay Ahead of the Game
              </h2>
              <p className="mt-1 text-center text-sm leading-relaxed text-stext">
                Get the latest cricket news, match updates and exclusive stories straight to your inbox.
              </p>
              <form onSubmit={(e) => void submit(e)} noValidate className="mt-5">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-stext">
                    Email <span className="text-danger">*</span>
                  </span>
                  <input
                    ref={inputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded bg-elevated px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-brand mt-3 w-full rounded px-5 py-2.5 text-sm font-medium disabled:opacity-60"
                >
                  {busy ? 'Subscribing…' : 'Subscribe'}
                </button>
                {offerAlerts ? (
                  <button
                    type="button"
                    onClick={() => void enableAlerts()}
                    disabled={alertsBusy}
                    className="mt-2 w-full rounded border border-lborder px-5 py-2 text-xs font-semibold text-mtext transition-colors hover:bg-secondary disabled:opacity-60"
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Bell size={13} />
                      {alertsBusy ? 'Asking your browser…' : 'Also notify me about live scores'}
                    </span>
                  </button>
                ) : null}
                {alertsOn ? (
                  <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-accent">
                    <Check size={13} /> Browser alerts enabled
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={dismiss}
                  className="mt-2 w-full rounded px-5 py-2 text-xs font-semibold text-stext transition-colors hover:text-mtext"
                >
                  No thanks
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
