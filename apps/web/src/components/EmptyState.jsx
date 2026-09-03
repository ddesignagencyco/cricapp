'use client';

import { SearchX } from 'lucide-react';

export default function EmptyState({ title = 'Nothing found', message = '', icon: Icon = SearchX, children }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-lborder bg-card/40 px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-stext">
        <Icon size={26} />
      </div>
      <h3 className="text-base font-bold text-mtext">{title}</h3>
      <p className="max-w-sm text-sm text-stext">{message}</p>
      {children}
    </div>
  );
}