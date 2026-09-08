'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

interface PopularTeamsProps {
  teams: any[];
}

export default function PopularTeams({ teams }: PopularTeamsProps) {
  if (!teams.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-mtext sm:text-2xl">Popular Teams</h2>
        <Link
          href="/teams"
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:text-accent2"
        >
          View all teams
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {teams.map((team: any) => (
          <TeamTile key={team.id} team={team} />
        ))}
      </div>
    </section>
  );
}

function TeamTile({ team }: { team: any }) {
  const name = team.name || '';
  const code = team.shortName || team.abbr || team.code || '';

  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex flex-col items-center justify-center rounded-xl bg-card p-4 text-center ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/30 hover:shadow-lg"
    >
      {team.logo ? (
        <img
          src={team.logo}
          alt={name}
          className="relative h-12 w-12 shrink-0 rounded-full border-2 border-white/10 bg-primary object-cover shadow-sm transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/10 text-base font-bold tracking-wider text-white shadow-sm transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${(hue + 40) % 360}, 90%, 40%))` }}
        >
          {getInitials(name || code)}
        </span>
      )}
      <p className="mt-2.5 w-full truncate text-[12px] font-semibold text-mtext group-hover:text-accent transition-colors">{name}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-stext">{code}</p>
    </Link>
  );
}
