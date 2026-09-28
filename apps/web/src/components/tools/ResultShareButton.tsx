'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useToolDef } from './toolResultContext';

const NOT_READY = new Set(['', '—', '–', '…', 'Loading']);

async function copyText(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall through to the legacy path */
    }
  }
  if (typeof document === 'undefined') return false;
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  return copied;
}

/**
 * Shares the computed result — not the bare tool page. The number goes in the
 * shared text so the recipient sees it without re-running the calculator.
 */
export default function ResultShareButton({ label, value }: { label: string; value: string }) {
  const tool = useToolDef();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const ready = !NOT_READY.has(value.trim());
  const headline = `${label}: ${value.trim()}`;

  const share = async () => {
    if (busy || !ready) return;
    setBusy(true);
    const text = tool ? `${tool.title} — ${headline}` : headline;
    const url = typeof window === 'undefined' ? '' : window.location.href;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: tool ? `${tool.title} result` : label, text, url });
      } else if ((await copyText(url ? `${text}\n${url}` : text))) {
        toast.success('Result copied to clipboard.');
      } else {
        toast.error('Sharing is not supported on this device.');
        return;
      }
      setDone(true);
      window.setTimeout(() => setDone(false), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('Could not share this result.');
    } finally {
      setBusy(false);
    }
  };

  const hint = ready ? `Share result: ${headline}` : 'No result to share yet';

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        void share();
      }}
      disabled={busy || !ready}
      className="icon-btn icon-btn-bordered h-8 w-8 shrink-0 disabled:opacity-40"
      aria-label={hint}
      title={hint}
    >
      {done ? <Check size={15} aria-hidden /> : <Share2 size={15} aria-hidden />}
    </button>
  );
}
