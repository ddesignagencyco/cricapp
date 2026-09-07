'use client';

import { Crown } from 'lucide-react';

export function PSLHeroBadge() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Crown size={18} className="text-gold" />
      <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
        Season {new Date().getFullYear()}
      </span>
    </div>
  );
}