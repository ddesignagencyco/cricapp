'use client';

import { useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { assistantContextFromLocation } from '../../lib/assistant';
import AssistantPanel from './AssistantPanel';
import { Bot } from 'lucide-react';

export default function AssistantLauncher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
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
      <AssistantPanel open={open} onClose={() => setOpen(false)} context={context} />
    </>
  );
}
