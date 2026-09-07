'use client';

import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';

export function PSLLeaderCard({ title, rows, accent }: { title: string; rows: { playerId: string; playerName: string; teamAbbr: string; value: string | number }[]; accent: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stext">
        <Trophy size={13} /> {title}
      </p>
      {rows.length > 0 ? (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.playerId} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-mtext">{r.playerName}</p>
                <p className="truncate text-xs text-stext">{r.teamAbbr}</p>
              </div>
              <span className={`font-mono text-lg font-bold tabular-nums ${accent === 'accent2' ? 'text-accent2' : 'text-accent'}`}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-stext">No data yet.</p>
      )}
      <Link href="/stats" className="mt-4 flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-accent2">
        Full statistics <ArrowRight size={14} />
      </Link>
    </div>
  );
}