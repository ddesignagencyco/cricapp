'use client';

import { useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { assistantContextFromLocation } from '../../lib/assistant';
import AssistantPanel from './AssistantPanel';

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
        className="btn-brand fixed bottom-[4.75rem] right-3 z-50 inline-flex h-11 items-center gap-2 rounded-2xl px-3.5 text-sm font-bold shadow-sm ring-1 ring-white/20 sm:right-4 lg:bottom-6 lg:h-12"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sparkles size={18} />
        <span className="hidden sm:inline">Ask</span>
      </button>
      <AssistantPanel open={open} onClose={() => setOpen(false)} context={context} />
    </>
  );
}
