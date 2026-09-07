'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getInitials } from '../utils/helpers';

interface TeamCardProps {
  team: any;
}

export default function TeamCard({ team }: TeamCardProps) {
  const name = team.name || '';
  const code = team.abbr || '';
  const initials = getInitials(name || code);

  let hash = 0;
  for (let i = 0; i < (code || name).length; i++) {
    hash = (code || name).charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-card text-center ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:shadow-xl hover:shadow-accent/10 hover:ring-accent/30"
    >
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={name}
            className="relative h-16 w-16 shrink-0 rounded-full border border-white/10 bg-primary object-cover shadow-md transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <span
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/10 text-xl font-black tracking-tight text-white shadow-md transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${(hue + 40) % 360}, 90%, 40%))` }}
          >
            {initials}
          </span>
        )}

        <h3 className="mt-4 w-full truncate text-[15px] font-bold text-mtext transition-colors group-hover:text-accent">
          {name}
        </h3>

        {team.country && (
          <p className="mt-1 w-full truncate text-xs text-stext">
            {team.country}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-1 border-t border-lborder/60 bg-primary/30 px-5 py-3 text-[11px] font-bold tracking-widest text-accent transition-colors group-hover:bg-accent/10">
        EXPLORE SQUAD
        <ArrowUpRight
          size={14}
          className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </Link>
  );
}
