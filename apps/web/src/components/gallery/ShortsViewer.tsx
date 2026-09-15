'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import { buildGalleryEmbedUrl } from '../../utils/galleryEmbed';
import type { GalleryShort } from './galleryTypes';

interface ShortsViewerProps {
  items: GalleryShort[];
  index: number;
  onClose: () => void;
  onIndexChange: (_index: number) => void;
  layout?: 'portrait' | 'landscape';
}

export default function ShortsViewer({ items, index, onClose, onIndexChange, layout = 'portrait' }: ShortsViewerProps) {
  const item = items[index];
  const embed = buildGalleryEmbedUrl(item?.embedUrl || item?.rawUrl);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown' && index < items.length - 1) onIndexChange(index + 1);
      if (event.key === 'ArrowUp' && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [index, items.length, onClose, onIndexChange]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/94 p-3" role="dialog" aria-modal="true" aria-label="Short">
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white" aria-label="Close short">
        <X size={18} />
      </button>
      <div className={`relative max-w-full overflow-hidden rounded-2xl bg-secondary ring-1 ring-white/10 ${
        layout === 'landscape'
          ? 'aspect-video w-[min(92vw,960px)]'
          : 'aspect-[9/16] h-[min(86vh,720px)] w-auto'
      }`}>
        {embed && item.kind === 'video' ? (
          <iframe
            title={item.title}
            src={embed}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : item.image ? (
          <RemoteImage src={item.image} alt={item.title} fill sizes="420px" fit="contain" className="news-image" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-white/60">No preview</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          {item.href && (
            <Link href={item.href} className="mt-1 inline-block text-xs font-semibold text-white/80 hover:underline">
              View source
            </Link>
          )}
        </div>
      </div>
      <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button type="button" disabled={index === 0} onClick={() => onIndexChange(index - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white disabled:opacity-30" aria-label="Previous short">
          <ChevronUp size={18} />
        </button>
        <button type="button" disabled={index === items.length - 1} onClick={() => onIndexChange(index + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white disabled:opacity-30" aria-label="Next short">
          <ChevronDown size={18} />
        </button>
      </div>
    </div>
  );
}
