'use client';

import Link from 'next/link';
import { ChevronRight, Globe } from 'lucide-react';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
import { getInitials, getPslLogo } from '../utils/helpers';

interface TeamCardProps {
  team: any;
}

export default function TeamCard({ team }: TeamCardProps) {
  const name = team.name || 'Cricket Club';
  const code = team.abbr || team.code || '';
  const country = team.country || '';
  const city = team.city || '';
  const initials = getInitials(name || code);

  const pslLogo = getPslLogo(code) || getPslLogo(team.id);
  const logo = team.logoUrl || team.logo || pslLogo;

  const location = [city, country].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="elev-card group flex items-center gap-3 rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]"
    >
      {logo ? (
        <RemoteImage
          src={logo}
          alt={name}
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-full border border-lborder bg-white object-contain p-1"
        />
      ) : (
        <EntityAvatar className="h-11 w-11 text-sm">{initials}</EntityAvatar>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent">
            {name}
          </h3>
          {code && (
            <span className="shrink-0 font-mono text-xs uppercase text-stext">{code}</span>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-stext">
          <Globe size={11} className="shrink-0" />
          {location.length > 0 ? location.join(' · ') : 'Cricket team'}
        </p>
      </div>

      <ChevronRight size={16} className="shrink-0 text-stext transition-colors group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}
