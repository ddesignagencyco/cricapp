'use client';

import Link from 'next/link';
import { Globe } from 'lucide-react';
import { getInitials } from '../utils/helpers';

interface TeamCardProps {
  team: any;
}

export default function TeamCard({ team }: TeamCardProps) {
  const name = team.name || '';
  const code = team.abbr || '';
  const initials = getInitials(name || code);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group block rounded-sm bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="flex items-start justify-between">
        {team.logoUrl ? (
          <img
            src={team.logoUrl}
            alt={name}
            className="h-14 w-14 rounded-full border-2 border-accent object-cover"
          />
        ) : (
          <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-accent bg-primary text-lg font-extrabold tracking-tight text-accent">
            {initials}
          </span>
        )}
        {team.country && (
          <span className="flex items-center gap-1 rounded-full bg-elevated px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-stext">
            <Globe size={12} /> {team.country}
          </span>
        )}
      </div>

      <h3 className="mt-4 text-base font-bold text-mtext">{name}</h3>
      <p className="text-xs font-semibold uppercase tracking-wider text-stext">
        {code || team.id}
      </p>
    </Link>
  );
}
