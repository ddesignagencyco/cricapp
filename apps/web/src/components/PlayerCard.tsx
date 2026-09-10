'use client';

import Link from 'next/link';
import { ChevronRight, MapPin, Shield } from 'lucide-react';
import Badge from './Badge';
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
  Manager: 'cancelled',
  Coach: 'cancelled',
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

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  return (
    <Link
      href={`/players/${player.id}`}
      className="group flex items-center gap-3 rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      {player.profileUrl || player.avatarUrl ? (
        <img
          src={player.profileUrl || player.avatarUrl}
          alt={name}
          loading="lazy"
          className="h-12 w-12 shrink-0 rounded-full border border-lborder bg-secondary object-cover"
        />
      ) : (
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, hsl(${hue}, 68%, 46%), hsl(${(hue + 38) % 360}, 72%, 32%))`,
          }}
          aria-hidden="true"
        >
          {initials}
        </span>
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