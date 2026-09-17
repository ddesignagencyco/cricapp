'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { unsubscribeNewsletter } from '../../services/newsletter';
import { ApiError } from '../../services/api/client';

export default function NewsletterUnsubscribeBody({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!token) {
      toast.error('This unsubscribe link is missing a token.');
      return;
    }
    setBusy(true);
    try {
      await unsubscribeNewsletter(token);
      setDone(true);
      toast.success('You have been unsubscribed.');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not unsubscribe.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-mtext">Newsletter</h1>
      {done ? (
        <p className="mt-3 text-sm text-stext">You will no longer receive newsletter emails.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-stext">Unsubscribe from PAK CRICZONE email updates.</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="btn-brand mt-6 rounded-md px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? 'Working…' : 'Unsubscribe'}
          </button>
        </>
      )}
    </div>
  );
}
