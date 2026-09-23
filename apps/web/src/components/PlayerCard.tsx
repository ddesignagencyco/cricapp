'use client';

import Link from 'next/link';
import { ChevronRight, MapPin, Shield } from 'lucide-react';
import Badge from './Badge';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
import { getInitials } from '../utils/helpers';

interface PlayerCardProps {
  player: any;
}

const roleTone: Record<string, string> = {
  Batsman: 'gold',
  Batter: 'gold',
  Bowler: 'live',
  'All-rounder': 'upcoming',
  'All Rounder': 'upcoming',
  Wicketkeeper: 'playoffs',
  'Wicket-Keeper': 'playoffs',
  Player: 'upcoming',
  Manager: 'neutral',
  Coach: 'neutral',
  Captain: 'gold',
};

function formatPlayerRole(rawRole: string): string {
  if (!rawRole) return 'Player';
  const clean = rawRole.replace(/_/g, ' ').trim();
  return clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const name = player.fullName || player.name || 'Cricket Player';
  const rawRole = player.role || 'Player';
  const role = formatPlayerRole(rawRole);
  const nationality = player.nationality || player.country || '';
  const teamName = player.team?.name || player.teamName || '';
  const initials = getInitials(name);
  const tone = roleTone[role] || roleTone[rawRole] || 'neutral';

  return (
    <Link
      href={`/players/${player.id}`}
      className="card-interactive group flex items-center gap-3 rounded-md p-3.5"
    >
      {player.profileUrl || player.avatarUrl ? (
        <RemoteImage
          src={player.profileUrl || player.avatarUrl}
          alt={name}
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full border border-lborder bg-entity-avatar object-cover"
        />
      ) : (
        <EntityAvatar className="h-12 w-12 text-sm">{initials}</EntityAvatar>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent">
            {name}
          </h3>
          <Badge tone={tone}>{role}</Badge>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-3 text-xs text-stext">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <Shield size={11} className="shrink-0" />
            <span className="truncate">{teamName || 'Independent player'}</span>
          </span>
          {nationality && (
            <span className="flex min-w-0 items-center gap-1 truncate">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{nationality}</span>
            </span>
          )}
        </div>
      </div>

      <ChevronRight
        size={16}
        className="shrink-0 text-stext transition-colors group-hover:text-accent"
        aria-hidden="true"
      />
    </Link>
  );
}