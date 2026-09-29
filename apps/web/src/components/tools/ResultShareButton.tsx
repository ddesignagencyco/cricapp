'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useToolDef } from './toolResultContext';
import { buildResultUrl, buildShareText, isShareableValue, shareSheetTitle, type ShareInput } from '../../lib/toolShare';

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
 * Shares the computed result, not the bare tool page. The answer is the first
 * line of the shared text and the inputs ride along in the query string, so the
 * recipient reads the number straight away and their copy of the page reopens
 * already filled in rather than showing a blank form.
 */
export default function ResultShareButton({
  label,
  value,
  inputs,
}: {
  label: string;
  value: string;
  inputs?: ShareInput[];
}) {
  const tool = useToolDef();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const ready = !NOT_READY.has(value.trim()) && isShareableValue(value);

  const share = async () => {
    if (busy || !ready) return;
    setBusy(true);
    try {
      const title = tool?.title ?? label;
      const base = typeof window === 'undefined' ? '' : window.location.href;
      const url = base ? buildResultUrl(base, tool?.slug ?? '', inputs) : '';
      const text = buildShareText({
        toolTitle: title,
        label,
        value,
        url,
        inputs,
      });

      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: shareSheetTitle(title, label), text, url: url || undefined });
      } else if (await copyText(text)) {
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

  const hint = ready ? `Share result: ${label} ${value.trim()}` : 'No result to share yet';

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
