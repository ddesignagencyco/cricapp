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

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group relative block overflow-hidden rounded-sm bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:shadow-lg hover:shadow-accent/10"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent2 to-accent2" />

      <div className="flex items-center gap-4 p-5">
        <div className="relative shrink-0">
          <span className="absolute inset-0 -m-1 rounded-full bg-accent/20 blur-md" />
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={name}
              className="relative h-14 w-14 rounded-full border-2 border-accent bg-primary object-cover"
            />
          ) : (
            <span className="relative grid h-14 w-14 place-items-center rounded-full border-2 border-accent bg-primary text-lg font-extrabold tracking-tight text-accent">
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-mtext group-hover:text-accent">
            {name}
          </h3>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-stext">
            {code || team.id}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-lborder px-5 py-2.5 text-[11px] text-stext">
        <span className="truncate">{team.country || 'Cricket Team'}</span>
        <span className="flex shrink-0 items-center gap-0.5 font-semibold text-accent">
          Explore
          <ArrowUpRight
            size={13}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
