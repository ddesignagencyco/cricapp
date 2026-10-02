'use client';

import { useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadMedia } from '../utils/mediaDownload';
import { getShareLink, type ShareType } from '../services/sharing';

type MediaActionsVariant = 'media' | 'card' | 'badge';
type MediaActionsSize = 'xs' | 'sm' | 'md';

const BOX: Record<MediaActionsSize, string> = { xs: 'h-7 w-7', sm: 'h-8 w-8', md: 'h-9 w-9' };

const ICON: Record<MediaActionsSize, number> = { xs: 12, sm: 13, md: 16 };

function buttonClass(variant: MediaActionsVariant, size: MediaActionsSize): string {
  if (variant === 'badge') {
    /* Same grey chip as the expand/play badges sitting next to it on the tile. */
    return `on-media grid ${BOX[size]} place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 transition-colors hover:bg-black/70 disabled:opacity-50`;
  }
  return variant === 'media'
    ? `btn-on-media on-media grid ${BOX[size]} place-items-center rounded-full`
    : `icon-btn icon-btn-bordered ${BOX[size]}`;
}

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

interface MediaActionsProps {
  /** Original asset used for the download. */
  url: string;
  title: string;
  /** Site path to share. Defaults to the page the button sits on. */
  shareHref?: string;
  shareText?: string;
  /** When set, the share link is resolved through the API (better OG text + share tracking). */
  shareType?: ShareType;
  shareId?: string;
  /** Icon size. Defaults to md (matches the lightbox toolbar). */
  size?: MediaActionsSize;
  /** `media` for the lightbox toolbar, `badge` for chips over a photo, `card` for light surfaces. */
  variant?: MediaActionsVariant;
  className?: string;
  buttonClassName?: string;
}

/**
 * Share + download pair for gallery media. Rendered on gallery cards, in the
 * photo lightbox toolbar and in the shorts viewer.
 */
export default function MediaActions({
  url,
  title,
  shareHref,
  shareText,
  shareType,
  shareId,
  size = 'md',
  variant = 'media',
  className = '',
  buttonClassName = '',
}: MediaActionsProps) {
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const stop = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    const fallbackUrl = () =>
      shareHref && typeof window !== 'undefined'
        ? `${window.location.origin}${shareHref}`
        : typeof window !== 'undefined'
          ? window.location.href
          : '';
    try {
      let target = fallbackUrl();
      let text = shareText || title;
      if (shareType && shareId) {
        // The API owns the canonical link and records the share.
        const link = await getShareLink(shareType, shareId);
        if (link.url) {
          try {
            target = `${window.location.origin}${new URL(link.url).pathname}`;
          } catch {
            target = link.url;
          }
        }
        text = link.ogDescription || link.ogTitle || text;
      }
      if (typeof navigator !== 'undefined' && navigator.share && target) {
        await navigator.share({ title, text, url: target });
        return;
      }
      if (!target) {
        toast.error('Sharing is not supported on this device.');
        return;
      }
      toast.success(
        (await copyText(target)) ? 'Link copied to clipboard.' : 'Could not copy the link.'
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const target = fallbackUrl();
      if (target && (await copyText(target))) toast.success('Link copied to clipboard.');
      else toast.error('Could not create the share link.');
    } finally {
      setSharing(false);
    }
  };

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const outcome = await downloadMedia(url, { title, fallbackExt: 'jpg' });
      if (outcome === 'downloaded') toast.success('Download started.');
      else toast('Opened the original file in a new tab.', { icon: '↗' });
    } finally {
      setDownloading(false);
    }
  };

  const base = `${buttonClass(variant, size)} disabled:opacity-60 ${buttonClassName}`.trim();

  return (
    <div className={`flex items-center gap-1 ${className}`.trim()}>
      <button
        type="button"
        onClick={(event) => {
          stop(event);
          void share();
        }}
        disabled={sharing}
        className={base}
        aria-label={`Share ${title}`}
        title={`Share ${title}`}
      >
        {sharing ? <Loader2 size={ICON[size]} className="animate-spin" aria-hidden /> : <Share2 size={ICON[size]} aria-hidden />}
      </button>
      <button
        type="button"
        onClick={(event) => {
          stop(event);
          void download();
        }}
        disabled={downloading || !url}
        className={base}
        aria-label={`Download ${title}`}
        title={`Download ${title}`}
      >
        {downloading ? <Loader2 size={ICON[size]} className="animate-spin" aria-hidden /> : <Download size={ICON[size]} aria-hidden />}
      </button>
    </div>
  );
}
