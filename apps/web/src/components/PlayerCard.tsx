'use client';

import Link from 'next/link';
import { User } from 'lucide-react';
import { getInitials } from '../utils/helpers';

interface PlayerCardProps {
  player: any;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  const name = player.fullName || player.name || '';
  const role = player.role || '';
  const nationality = player.nationality || '';
  const teamName = player.team?.name || player.teamName || '';
  const initials = getInitials(name);

  return (
    <Link
      href={`/players/${player.id}`}
      className="group block rounded-sm bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-elevated text-accent ring-1 ring-lborder">
        {initials || <User size={24} />}
      </div>
      <h3 className="text-base font-bold text-mtext">{name}</h3>
      {teamName && <p className="text-xs font-semibold text-stext">{teamName}</p>}
      <p className="text-[11px] text-stext">
        {[role, nationality].filter(Boolean).join(' \u2022 ') || player.id}
      </p>
    </Link>
  );
}
