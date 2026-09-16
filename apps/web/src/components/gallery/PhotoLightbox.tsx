'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import NewsCopy from '../NewsCopy';
import ImageZoomer, { CLICK_ZOOM, MAX_ZOOM, MIN_ZOOM, STEP } from './ImageZoomer';
import useFocusTrap from '../../hooks/useFocusTrap';
import type { GalleryPhoto } from './galleryTypes';

interface PhotoLightboxProps {
  items: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (_index: number) => void;
}

const iconButton =
  'btn-on-media on-media grid h-9 w-9 place-items-center rounded-full';

export default function PhotoLightbox({ items, index, onClose, onIndexChange }: PhotoLightboxProps) {
  const item = items[index];
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const dialogRef = useFocusTrap<HTMLDivElement>(Boolean(item));

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
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[70] flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label={item.title || 'Photo'}
    >
      <div className="text-on-media flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-on-media-muted text-xs font-medium tabular-nums">{index + 1} / {items.length}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - STEP))}
            disabled={zoom <= MIN_ZOOM}
            className={iconButton}
            aria-label="Zoom out"
          >
            <ZoomOut size={16} aria-hidden="true" />
          </button>
          <span className="text-on-media min-w-[3rem] text-center text-[11px] font-semibold tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value <= MIN_ZOOM ? CLICK_ZOOM : value + STEP))}
            disabled={zoom >= MAX_ZOOM}
            className={iconButton}
            aria-label="Zoom in"
          >
            <ZoomIn size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(MIN_ZOOM)}
            disabled={zoom <= MIN_ZOOM}
            className={iconButton}
            aria-label="Reset zoom"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
          <button type="button" onClick={onClose} className={`${iconButton} ml-1`} aria-label="Close photo">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="relative min-h-[60vh] flex-1">
        <ImageZoomer key={item.id} src={item.src} alt={item.title} zoom={zoom} onZoomChange={setZoom} />
        {index > 0 && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            className="btn-on-media on-media absolute left-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full"
            aria-label="Previous photo"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        )}
        {index < items.length - 1 && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            className="btn-on-media on-media absolute right-2 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full"
            aria-label="Next photo"
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="text-on-media space-y-1.5 px-4 py-4">
        <NewsCopy as="p" language={item.language} text={item.title} className="text-sm font-semibold">
          {item.title}
        </NewsCopy>
        {item.excerpt ? <p className="text-on-media-muted text-xs">{item.excerpt}</p> : null}
        <div className="text-on-media-muted flex items-center justify-between gap-3 text-xs font-medium">
          <span>
            {[item.author, item.date].filter(Boolean).join(' · ') || 'Click image to zoom · Scroll or drag to move'}
          </span>
          {articleHref ? (
            <Link href={articleHref} className="text-on-media on-media font-semibold underline underline-offset-2">
              Open article
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
