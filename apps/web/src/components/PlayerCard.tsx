'use client';

import Link from 'next/link';
import { MapPin, Shield } from 'lucide-react';
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
  'Wicketkeeper': 'playoffs',
  'Wicket-Keeper': 'playoffs',
};

export default function PlayerCard({ player }: PlayerCardProps) {
  const name = player.fullName || player.name || '';
  const role = player.role || '';
  const nationality = player.nationality || '';
  const teamName = player.team?.name || player.teamName || '';
  const initials = getInitials(name);
  const tone = roleTone[role] || 'neutral';

  return (
    <Link
      href={`/players/${player.id}`}
      className="group relative block overflow-hidden rounded-sm bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/40 hover:shadow-lg hover:shadow-accent/10"
    >
      <div className="relative flex items-center gap-4 bg-gradient-to-r from-accent/15 via-secondary/30 to-transparent p-5 pb-4">
        <div className="relative shrink-0">
          <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-accent bg-primary text-xl font-extrabold tracking-tight text-accent transition-transform duration-300 group-hover:scale-105">
            {initials}
          </span>
          {role && (
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-white ring-2 ring-card">
              <Shield size={12} />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-mtext group-hover:text-accent">
            {name}
          </h3>
          {teamName && (
            <p className="truncate text-xs font-semibold text-stext">{teamName}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-lborder bg-primary/40 px-5 py-3">
        <Badge tone={tone}>{role || 'Player'}</Badge>
        {nationality && (
          <span className="flex min-w-0 items-center gap-1 truncate text-[11px] text-stext">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{nationality}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
