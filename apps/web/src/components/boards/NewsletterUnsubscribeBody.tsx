'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  fetchNewsletterSubscription,
  resubscribeNewsletter,
  unsubscribeNewsletter,
  updateNewsletterPreferences,
  type NewsletterSubscription,
  type NewsletterType,
} from '../../services/newsletter';
import { ApiError } from '../../services/api/client';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

/**
 * Email-link landing page for newsletter subscribers. The token in the link is the
 * subscriber's only credential, so this page can show a masked address, switch
 * individual newsletters on or off, unsubscribe from everything, and undo that.
 */
export default function NewsletterUnsubscribeBody({ token, manage = false }: { token: string; manage?: boolean }) {
  const [sub, setSub] = useState<NewsletterSubscription | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'invalid'>(token ? 'loading' : 'invalid');
  const [draft, setDraft] = useState<Partial<Record<NewsletterType, boolean>>>({});
  const [busy, setBusy] = useState<'save' | 'unsubscribe' | 'resubscribe' | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchNewsletterSubscription(token)
      .then((res) => {
        setSub(res);
        setDraft(Object.fromEntries(res.preferences.map((p) => [p.type, p.enabled])));
        setLoadState('ready');
      })
      .catch(() => setLoadState('invalid'));
  }, [token]);

  const apply = (res: NewsletterSubscription) => {
    setSub(res);
    setDraft(Object.fromEntries(res.preferences.map((p) => [p.type, p.enabled])));
  };

  const save = async () => {
    setBusy('save');
    try {
      const res = await updateNewsletterPreferences(token, draft);
      apply(res);
      toast.success(res.status === 'active' ? 'Your email preferences are saved.' : 'You have been unsubscribed.');
    } catch (error) {
      toast.error(errorText(error, 'Could not save your preferences.'));
    } finally {
      setBusy(null);
    }
  };

  const unsubscribeAll = async () => {
    setBusy('unsubscribe');
    try {
      await unsubscribeNewsletter(token);
      apply(await fetchNewsletterSubscription(token));
      toast.success('You have been unsubscribed.');
    } catch (error) {
      toast.error(errorText(error, 'Could not unsubscribe.'));
    } finally {
      setBusy(null);
    }
  };

  const resubscribe = async () => {
    setBusy('resubscribe');
    try {
      const res = await resubscribeNewsletter(token);
      apply(await fetchNewsletterSubscription(token));
      toast.success(res.message);
    } catch (error) {
      toast.error(errorText(error, 'Could not resubscribe.'));
    } finally {
      setBusy(null);
    }
  };

  if (loadState === 'loading') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-stext">Loading your email preferences…</p>
      </div>
    );
  }

  if (loadState === 'invalid' || !sub) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-mtext">Newsletter</h1>
        <p className="mt-3 text-sm text-stext">
          This link is not valid any more. Use the unsubscribe link in your most recent PakCricZone email.
        </p>
        <Link href="/" className="btn-brand mt-6 inline-block rounded-md px-5 py-2.5 text-sm font-semibold">
          Go to PakCricZone
        </Link>
      </div>
    );
  }

  const active = sub.status === 'active';
  const changed = sub.preferences.some((p) => (draft[p.type] ?? p.enabled) !== p.enabled);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-mtext">{manage && active ? 'Email preferences' : 'Newsletter'}</h1>
      <p className="mt-2 text-sm text-stext">
        For <span className="font-semibold text-mtext">{sub.email}</span>
        {active ? ' — choose which emails you get.' : ' — you are unsubscribed and will not get any newsletters.'}
      </p>

      {active ? (
        <>
          <ul className="mt-6 divide-y divide-lborder overflow-hidden rounded-xl bg-card ring-1 ring-lborder">
            {sub.preferences.map((p) => {
              const on = draft[p.type] ?? p.enabled;
              const id = `nl-pref-${p.type}`;
              return (
                <li key={p.type} className="flex items-start justify-between gap-4 px-4 py-3.5">
                  <label htmlFor={id} className="min-w-0 cursor-pointer">
                    <span className="block text-sm font-semibold text-mtext">{p.label}</span>
                    <span className="mt-0.5 block text-xs text-stext">{p.description}</span>
                  </label>
                  <button
                    id={id}
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => setDraft((d) => ({ ...d, [p.type]: !on }))}
                    className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-accent' : 'bg-lborder'}`}
                  >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    <span className="sr-only">{on ? 'On' : 'Off'}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={!changed || busy !== null}
              onClick={() => void save()}
              className="btn-brand rounded-md px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy === 'save' ? 'Saving…' : 'Save preferences'}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void unsubscribeAll()}
              className="text-sm font-semibold text-stext underline underline-offset-2 hover:text-mtext disabled:opacity-60"
            >
              {busy === 'unsubscribe' ? 'Working…' : 'Unsubscribe from all emails'}
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-xl bg-card p-5 ring-1 ring-lborder">
          <p className="text-sm text-stext">Changed your mind? You can subscribe again with one click.</p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void resubscribe()}
            className="btn-brand mt-4 rounded-md px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy === 'resubscribe' ? 'Working…' : 'Subscribe again'}
          </button>
        </div>
      )}
    </div>
  );
}
