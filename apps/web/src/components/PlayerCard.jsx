'use client';

import Link from 'next/link';
import { User } from 'lucide-react';

export default function PlayerCard({ player }) {
  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Link
      href={`/players/${player.id}`}
      className="group block rounded-2xl bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-elevated text-accent ring-1 ring-lborder">
        {initials || <User size={24} />}
      </div>
      <h3 className="text-base font-bold text-mtext">{player.name}</h3>
      <p className="text-xs font-semibold text-stext">{player.teamName}</p>
      <p className="text-[11px] text-stext">{player.role} • {player.country}</p>

      <div className="mt-4 flex items-center justify-between border-t border-lborder pt-3">
        <div>
          <p className="font-mono text-base font-bold text-mtext">{player.matches}</p>
          <p className="text-[10px] uppercase tracking-wider text-stext">Matches</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold text-accent2">{player.runs}</p>
          <p className="text-[10px] uppercase tracking-wider text-stext">Runs</p>
        </div>
        <div>
          <p className="font-mono text-base font-bold text-accent">{player.wickets}</p>
          <p className="text-[10px] uppercase tracking-wider text-stext">Wickets</p>
        </div>
      </div>
    </Link>
  );
}