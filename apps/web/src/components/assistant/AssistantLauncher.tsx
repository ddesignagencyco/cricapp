'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { assistantContextFromLocation } from '../../lib/assistant';
import { Bot } from 'lucide-react';
import { preloadWhenIdle } from '../../utils/preloadWhenIdle';

// The 389-line panel (plus AnswerBoard/SourceChips/assistant lib) stays out of
// the initial bundle. It is fetched once the page is idle (and on first touch),
// because loading it only on tap left phones on slow networks with a hidden FAB
// and no panel for seconds — the assistant looked broken.
const loadAssistantPanel = () => import('./AssistantPanel');
const AssistantPanel = dynamic(loadAssistantPanel, { ssr: false });

export default function AssistantLauncher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  useEffect(() => preloadWhenIdle(loadAssistantPanel), []);
  const tucked = useTuckOnScroll();
  const context = useMemo(
    () => assistantContextFromLocation(pathname, searchParams.toString()),
    [pathname, searchParams],
  );

  return (
    <>
      <button
        type="button"
        onPointerDown={() => void loadAssistantPanel()}
        onClick={() => setOpen(true)}
        className={`float-cta btn-brand fixed bottom-20 right-3 z-[70] h-11 w-11 place-items-center rounded-full ring-1 ring-white/20 transition-[transform,opacity] duration-200 motion-reduce:transition-none sm:right-4 lg:bottom-6 lg:translate-x-0 lg:opacity-100 ${open ? 'hidden sm:grid' : 'grid'} ${tucked ? 'pointer-events-none translate-x-16 opacity-0 lg:pointer-events-auto' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open CriczApp Assistant"
      >
        <Bot size={26} strokeWidth={2.15} aria-hidden />
      </button>
      {mounted ? <AssistantPanel open={open} onClose={() => setOpen(false)} context={context} /> : null}
    </>
  );
}

/**
 * Phones: slide the floating button out of the way while the reader scrolls
 * down — at the right edge it sat on top of card actions such as the favourite
 * hearts on the team and player lists — and bring it back on scroll up or once
 * scrolling stops.
 */
function useTuckOnScroll(): boolean {
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY + 8 && y > 160) setTucked(true);
      else if (y < lastY - 8) setTucked(false);
      lastY = y;
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => setTucked(false), 1200);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (idle) clearTimeout(idle);
    };
  }, []);
  return tucked;
}
