'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Shield, Sparkles, User } from 'lucide-react';
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

  // Generate color hue based on player name for unique avatar glow
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  return (
    <Link
      href={`/players/${player.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-lborder bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-elevated hover:shadow-xl hover:shadow-accent/10"
    >
      {/* Background ambient gradient flare */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: `hsl(${hue}, 85%, 55%)` }}
      />

      <div>
        {/* Top bar: Role Badge & Nationality */}
        <div className="flex items-center justify-between gap-2">
          <Badge tone={tone}>{role}</Badge>
          {nationality && (
            <span className="flex items-center gap-1 font-mono text-xs font-semibold text-stext">
              <MapPin size={11} className="text-accent shrink-0" />
              <span className="truncate max-w-[120px]">{nationality}</span>
            </span>
          )}
        </div>

        {/* Player Avatar and Info */}
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="relative mb-3.5">
            {/* Glow ring behind avatar */}
            <div
              className="absolute -inset-1 rounded-full opacity-20 blur-md transition-all duration-500 group-hover:opacity-60 group-hover:scale-110"
              style={{
                background: `linear-gradient(135deg, hsl(${hue}, 80%, 55%), hsl(${(hue + 45) % 360}, 90%, 45%))`,
              }}
            />
            {player.profileUrl || player.avatarUrl ? (
              <img
                src={player.profileUrl || player.avatarUrl}
                alt={name}
                loading="lazy"
                className="relative h-20 w-20 rounded-full border-2 border-white/20 bg-primary object-cover shadow-md transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div
                className="relative grid h-20 w-20 place-items-center rounded-full border-2 border-white/20 text-2xl font-black tracking-tight text-white shadow-md transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundImage: `linear-gradient(135deg, hsl(${hue}, 80%, 50%), hsl(${(hue + 50) % 360}, 85%, 35%))`,
                }}
              >
                {initials}
              </div>
            )}
          </div>

          <h3 className="w-full text-base font-black tracking-tight text-mtext transition-colors group-hover:text-accent line-clamp-1">
            {name}
          </h3>

          {teamName ? (
            <p className="mt-1 flex items-center justify-center gap-1 text-xs font-semibold text-stext line-clamp-1">
              <Shield size={11} className="text-accent shrink-0" />
              <span>{teamName}</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-stext/80">Independent Pro</p>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-lborder/60 pt-3 text-xs">
        <span className="text-xs font-semibold text-stext">View Profile</span>
        <span className="inline-flex items-center gap-1 font-bold text-accent transition-transform duration-300 group-hover:translate-x-1">
          <span>Stats</span>
          <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}