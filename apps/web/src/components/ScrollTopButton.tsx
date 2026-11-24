'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      className={`float-cta fixed bottom-[8.5rem] right-3 z-[70] grid h-10 w-10 place-items-center rounded-full border border-lborder bg-elevated text-mtext transition-[transform,opacity,background-color,border-color] hover:border-border-strong hover:bg-[var(--color-row-hover)] motion-reduce:transition-none sm:right-4 lg:bottom-[4.75rem] ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <ArrowUp size={18} />
    </button>
  );
}
