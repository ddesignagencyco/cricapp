'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Target, User } from 'lucide-react';
import Badge from '../Badge';
import StatCard from '../StatCard';
import Tabs from '../Tabs';
import MatchCard from '../MatchCard';
import EmptyState from '../EmptyState';
import FavoriteButton from '../FavoriteButton';
import { getInitials } from '../../utils/helpers';

const playerTabs = [
  { key: 'profile', label: 'Profile' },
  { key: 'recent', label: 'Recent Matches' },
];

interface Props {
  player: any;
}

export default function PlayerDetailBody({ player }: Props) {
  const [tab, setTab] = useState('profile');

  if (!player) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Player not found" message="We couldn't find that player in our directory." />
      </div>
    );
  }

  const name = player.fullName || player.shortName || '';
  const team = player.team;
  const nickname = player.shortName?.split(', ')[0];
  const initials = getInitials(name);

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/players" className="hover:text-accent">Players</Link>
        <span>/</span>
        <span className="text-mtext">{name}</span>
      </nav>

      <header className="rounded-3xl bg-card p-6 ring-1 ring-lborder sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-elevated text-3xl font-black text-accent ring-1 ring-lborder">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{name}</h1>
              <FavoriteButton id={player.id} type="player" size={20} />
            </div>
            {nickname && nickname !== name && (
              <p className="mt-0.5 text-sm text-stext">{nickname}</p>
            )}
            <p className="mt-1 text-sm text-stext">
              {[player.role, player.nationality].filter(Boolean).join(' • ')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {player.role && <Badge tone="neutral">{player.role}</Badge>}
              {player.battingStyle && <Badge tone="neutral">{player.battingStyle}</Badge>}
              {player.bowlingStyle && <Badge tone="neutral">{player.bowlingStyle}</Badge>}
            </div>
          </div>

          {team && (
            <Link
              href={`/teams/${team.id}`}
              className="group flex shrink-0 items-center gap-3 rounded-2xl bg-elevated px-4 py-3 transition-colors hover:bg-card"
            >
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="h-12 w-12 rounded-full border-2 border-accent object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-accent bg-primary text-sm font-extrabold text-accent">
                  {getInitials(team.name || team.abbr)}
                </span>
              )}
              <div>
                <p className="text-xs text-stext">Team</p>
                <p className="text-sm font-bold text-mtext group-hover:text-accent">{team.name} ({team.abbr})</p>
              </div>
            </Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 pt-4 lg:grid-cols-4">
        <StatCard label="Player ID" value={player.id.split(':').pop()} sub="Provider id" icon={User} />
        <StatCard label="Role" value={player.role || '—'} sub="Squad" />
        <StatCard label="Nationality" value={player.nationality || '—'} />
        {player.birth && <StatCard label="Born" value={player.birth} sub="Date of birth" icon={Calendar} />}
      </div>

      <div className="pt-4">
        <Tabs tabs={playerTabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'profile' && (
        <div className="fade-in grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Short Name" value={player.shortName || '—'} sub="Preferred" />
          <StatCard label="Batting" value={player.battingStyle || '—'} sub="Style" />
          <StatCard label="Bowling" value={player.bowlingStyle || '—'} sub="Style" tone="accent" />
          <StatCard label="Team" value={team?.abbr || '—'} sub="Franchise" tone="gold" />
        </div>
      )}

      {tab === 'recent' && (
        <div className="fade-in pt-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
            <Target size={18} className="text-accent" /> Recent Matches
          </h3>
          {player.recentMatches && player.recentMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {player.recentMatches.map((m) => (
                <MatchCard key={m.matchId} match={m} showVenue={false} />
              ))}
            </div>
          ) : (
            <EmptyState title="No recent matches" message="This player's recent fixtures have not been recorded yet." />
          )}
        </div>
      )}
    </div>
  );
}
