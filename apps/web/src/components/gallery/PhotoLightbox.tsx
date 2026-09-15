'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import NewsCopy from '../NewsCopy';
import ImageZoomer, { CLICK_ZOOM, MAX_ZOOM, MIN_ZOOM, STEP } from './ImageZoomer';
import type { GalleryPhoto } from './galleryTypes';

interface PhotoLightboxProps {
  items: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (_index: number) => void;
}

export default function PhotoLightbox({ items, index, onClose, onIndexChange }: PhotoLightboxProps) {
  const item = items[index];
  const [zoom, setZoom] = useState(MIN_ZOOM);

  useEffect(() => {
    setZoom(MIN_ZOOM);
  }, [item?.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && index < items.length - 1) onIndexChange(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      if (event.key === '+' || event.key === '=') {
        setZoom((value) => Math.min(MAX_ZOOM, value <= MIN_ZOOM ? CLICK_ZOOM : value + STEP));
      }
      if (event.key === '-' || event.key === '_') setZoom((value) => Math.max(MIN_ZOOM, value - STEP));
      if (event.key === '0') setZoom(MIN_ZOOM);
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

  const articleHref = item.href && !item.href.startsWith('/gallery') ? item.href : null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/92" role="dialog" aria-modal="true" aria-label="Photo">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="text-xs text-white/70">{index + 1} / {items.length}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - STEP))}
            disabled={zoom <= MIN_ZOOM}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="min-w-[3rem] text-center text-[11px] font-semibold tabular-nums text-white/80">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value <= MIN_ZOOM ? CLICK_ZOOM : value + STEP))}
            disabled={zoom >= MAX_ZOOM}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(MIN_ZOOM)}
            disabled={zoom <= MIN_ZOOM}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 disabled:opacity-40"
            aria-label="Reset zoom"
          >
            <RotateCcw size={15} />
          </button>
          <button type="button" onClick={onClose} className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label="Close photo">
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="relative min-h-[60vh] flex-1">
        <ImageZoomer key={item.id} src={item.src} alt={item.title} zoom={zoom} onZoomChange={setZoom} />
        {index > 0 && (
          <button type="button" onClick={() => onIndexChange(index - 1)} className="absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white" aria-label="Previous photo">
            <ChevronLeft size={20} />
          </button>
        )}
        {index < items.length - 1 && (
          <button type="button" onClick={() => onIndexChange(index + 1)} className="absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white" aria-label="Next photo">
            <ChevronRight size={20} />
          </button>
        )}
      </div>
      <div className="space-y-1.5 px-4 py-4 text-white">
        <NewsCopy as="p" language={item.language} text={item.title} className="text-sm font-semibold">
          {item.title}
        </NewsCopy>
        {item.excerpt ? <p className="text-xs text-white/70">{item.excerpt}</p> : null}
        <div className="flex items-center justify-between gap-3 text-xs text-white/70">
          <span>
            {[item.author, item.date].filter(Boolean).join(' · ') || 'Click image to zoom · Scroll or drag to move'}
          </span>
          {articleHref ? (
            <Link href={articleHref} className="font-semibold text-white hover:underline">Open article</Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
