'use client';

import Link from 'next/link';
import { ChevronRight, Globe } from 'lucide-react';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
import FavoriteButton from './FavoriteButton';
import ShareButton from './ShareButton';
import { getInitials, getPslLogo } from '../utils/helpers';
import { directoryRowCard } from './ui/interaction';

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

  const teamId = String(team.id || code);
  const href = `/teams/${teamId}`;

  return (
    <article className={directoryRowCard}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        {logo ? (
          <RemoteImage
            src={logo}
            alt={name}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full border border-lborder bg-white object-contain p-1"
          />
        ) : (
          <EntityAvatar className="h-12 w-12 text-sm">{initials}</EntityAvatar>
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
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <FavoriteButton targetType="team" targetId={teamId} compact />
        <ShareButton type="team" id={teamId} fallbackTitle={name} href={href} compact />
        <Link
          href={href}
          className="grid h-8 w-8 place-items-center text-stext transition-colors group-hover:text-accent"
          aria-label="View team"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
