'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { subscribeNewsletter } from '../services/newsletter';
import { ApiError } from '../services/api/client';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter your email.');
      return;
    }
    setBusy(true);
    try {
      const res = await subscribeNewsletter(email.trim());
      toast.success(res.message || 'Subscription confirmed.');
      setEmail('');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not subscribe.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
        <form
          onSubmit={(e) => void submit(e)}
          noValidate
          className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-start gap-3 sm:items-center sm:gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent sm:h-12 sm:w-12">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-mtext sm:text-lg">Stay Ahead of the Game</h3>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-stext sm:text-sm">
                Get the latest cricket news, match updates and exclusive stories straight to your inbox.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end lg:w-auto">
            <label className="flex min-w-0 flex-1 flex-col sm:w-64">
              <span className="mb-1.5 text-xs font-semibold text-stext">
                Email <span className="text-danger">*</span>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-w-0 w-full rounded bg-elevated px-4 py-2.5 text-sm text-mtext ring-1 ring-lborder outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="btn-brand shrink-0 rounded px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {busy ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
