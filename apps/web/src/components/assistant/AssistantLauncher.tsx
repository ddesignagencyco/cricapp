'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { assistantContextFromLocation } from '../../lib/assistant';
import { Bot } from 'lucide-react';

// The 389-line panel (plus AnswerBoard/SourceChips/assistant lib) loads only
// after the first open — never in the initial bundle. The FAB stays instant.
const AssistantPanel = dynamic(() => import('./AssistantPanel'), { ssr: false });

export default function AssistantLauncher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  const context = useMemo(
    () => assistantContextFromLocation(pathname, searchParams.toString()),
    [pathname, searchParams],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`float-cta btn-brand fixed bottom-20 right-3 z-[70] h-11 w-11 place-items-center rounded-full ring-1 ring-white/20 motion-reduce:transition-none sm:right-4 lg:bottom-6 ${open ? 'hidden sm:grid' : 'grid'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open PCZ Assistant"
      >
        <Bot size={26} strokeWidth={2.15} aria-hidden />
      </button>
      {mounted ? <AssistantPanel open={open} onClose={() => setOpen(false)} context={context} /> : null}
    </>
  );
}
