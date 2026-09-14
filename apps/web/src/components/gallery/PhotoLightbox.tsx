'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import NewsCopy from '../NewsCopy';
import type { GalleryPhoto } from './galleryTypes';

interface PhotoLightboxProps {
  items: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function PhotoLightbox({ items, index, onClose, onIndexChange }: PhotoLightboxProps) {
  const item = items[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
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
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/92" role="dialog" aria-modal="true" aria-label="Photo">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="text-xs text-white/70">{index + 1} / {items.length}</p>
        <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Close photo">
          <X size={18} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <RemoteImage src={item.src} alt={item.title} fill sizes="100vw" fit="contain" className="news-image" />
        {index > 0 && (
          <button type="button" onClick={() => onIndexChange(index - 1)} className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white" aria-label="Previous photo">
            <ChevronLeft size={20} />
          </button>
        )}
        {index < items.length - 1 && (
          <button type="button" onClick={() => onIndexChange(index + 1)} className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white" aria-label="Next photo">
            <ChevronRight size={20} />
          </button>
        )}
      </div>
      <div className="space-y-2 px-4 py-4 text-white">
        <NewsCopy as="p" language={item.language} text={item.title} className="text-sm font-semibold">
          {item.title}
        </NewsCopy>
        <div className="flex items-center justify-between gap-3 text-xs text-white/70">
          <span>{[item.author, item.date].filter(Boolean).join(' · ')}</span>
          <Link href={item.href} className="font-semibold text-white hover:underline">Open article</Link>
        </div>
      </div>
    </div>
  );
}
