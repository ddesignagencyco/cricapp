'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import NewsCopy from '../NewsCopy';
import type { GalleryPhoto } from './galleryTypes';

const STORY_MS = 5500;

interface StoryViewerProps {
  items: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (_index: number) => void;
}

export default function StoryViewer({ items, index, onClose, onIndexChange }: StoryViewerProps) {
  const item = items[index];
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick(0);
    const started = Date.now();
    const frame = window.setInterval(() => setTick(Date.now() - started), 50);
    const advance = window.setTimeout(() => {
      if (index < items.length - 1) onIndexChange(index + 1);
      else onClose();
    }, STORY_MS);
    return () => {
      window.clearInterval(frame);
      window.clearTimeout(advance);
    };
  }, [index, items.length, onClose, onIndexChange]);

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
  const progress = Math.min(1, tick / STORY_MS);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Story">
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-secondary shadow-2xl ring-1 ring-white/10">
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 px-3 pt-3">
          {items.map((story, i) => (
            <div key={story.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full bg-white"
                style={{
                  width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-6 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white"
          aria-label="Close story"
        >
          <X size={16} />
        </button>

        <div className="relative min-h-0 flex-1">
          <RemoteImage src={item.src} alt={item.title} fill sizes="480px" fit="contain" className="news-image" />
          <button type="button" className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous story" onClick={() => index > 0 && onIndexChange(index - 1)} />
          <button type="button" className="absolute inset-y-0 right-0 w-1/3" aria-label="Next story" onClick={() => (index < items.length - 1 ? onIndexChange(index + 1) : onClose())} />
        </div>

        <div className="relative z-10 space-y-2 bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-8">
          <NewsCopy as="p" language={item.language} text={item.title} className="text-sm font-semibold text-white">
            {item.title}
          </NewsCopy>
          {item.excerpt && (
            <NewsCopy language={item.language} text={item.excerpt} className="line-clamp-2 text-xs text-white/75">
              {item.excerpt}
            </NewsCopy>
          )}
          <div className="flex items-center justify-between gap-3 pt-1 text-xs text-white/70">
            <span>{[item.author, item.date].filter(Boolean).join(' · ')}</span>
            <Link href={item.href} className="font-semibold text-white hover:underline">
              Open article
            </Link>
          </div>
        </div>
      </div>

      {index > 0 && (
        <button
          type="button"
          onClick={() => onIndexChange(index - 1)}
          className="absolute left-3 hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-white sm:grid"
          aria-label="Previous"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={() => onIndexChange(index + 1)}
          className="absolute right-3 hidden h-10 w-10 place-items-center rounded-full bg-white/10 text-white sm:grid"
          aria-label="Next"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
