'use client';

import { useState } from 'react';
import { Loader2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getShareLink, type ShareType } from '../services/sharing';

interface ShareButtonProps {
  type: ShareType;
  id: string;
  fallbackTitle: string;
  compact?: boolean;
  className?: string;
}

function siteShareUrl(apiUrl: string): string {
  if (typeof window === 'undefined') return apiUrl;
  try {
    const path = new URL(apiUrl).pathname;
    return `${window.location.origin}${path}`;
  } catch {
    return window.location.href;
  }
}

export default function ShareButton({ type, id, fallbackTitle, compact = false, className = '' }: ShareButtonProps) {
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const link = await getShareLink(type, id);
      const url = siteShareUrl(link.url);
      const shareData: ShareData = {
        title: link.ogTitle || fallbackTitle,
        text: link.ogDescription || fallbackTitle,
        url,
      };
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard.');
      } else {
        toast.error('Sharing is not supported on this device.');
      }
    } catch {
      const fallbackUrl = typeof window !== 'undefined' ? window.location.href : '';
      if (fallbackUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(fallbackUrl);
        toast.success('Link copied to clipboard.');
      } else {
        toast.error('Could not create the share link.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={share}
        disabled={busy}
        title={`Share ${fallbackTitle}`}
        className={`grid h-9 w-9 place-items-center rounded-xl border border-lborder bg-secondary text-stext transition-all hover:border-accent/40 hover:bg-card hover:text-mtext disabled:opacity-60 ${className}`}
        aria-label={`Share ${fallbackTitle}`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      disabled={busy}
      className={`inline-flex items-center gap-2 rounded bg-elevated px-4 py-2 text-sm font-bold text-mtext ring-1 ring-lborder transition-colors hover:bg-card disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />}
      Share
    </button>
  );
}
