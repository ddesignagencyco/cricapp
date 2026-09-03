'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Collapsible({ title, subtitle, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-elevated text-accent">
              <Icon size={17} />
            </span>
          )}
          <div>
            <p className="text-sm font-bold text-mtext">{title}</p>
            {subtitle && <p className="text-xs text-stext">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-stext transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="border-t border-lborder p-5">{children}</div>}
    </div>
  );
}