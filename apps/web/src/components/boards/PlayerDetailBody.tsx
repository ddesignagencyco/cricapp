'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Target, User } from 'lucide-react';
import StatCard from '../StatCard';
import Tabs from '../Tabs';
import MatchCard from '../MatchCard';
import EmptyState from '../EmptyState';
import TeamLogo from '../TeamLogo';
import FavoriteButton from '../FavoriteButton';
import ShareButton from '../ShareButton';
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
  const role = String(player.role || 'Player')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/players" className="hover:text-accent">Players</Link>
        <span>/</span>
        <span className="text-mtext">{name}</span>
      </nav>

      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-lborder pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-accent">
              {role}
            </span>
            {player.nationality && (
              <span className="rounded border border-lborder bg-secondary px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-stext">
                {player.nationality}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton targetType="player" targetId={player.id} compact />
            <ShareButton
              type="player"
              id={player.id}
              fallbackTitle={name}
              compact
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-center">
          <div className="shrink-0">
            {player.profileUrl ? (
              <img
                src={player.profileUrl}
                alt={name}
                className="h-20 w-20 rounded-full border border-lborder bg-secondary object-cover"
              />
            ) : (
              (() => {
                let hash = 0;
                for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                const hue = Math.abs(hash % 360);
                return (
                  <div
                    className="grid h-20 w-20 place-items-center rounded-full text-xl font-semibold text-white"
                    style={{
                      backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))`,
                    }}
                  >
                    {initials}
                  </div>
                );
              })()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-mtext">{name}</h1>
            {nickname && nickname !== name && (
              <p className="mt-1 font-mono text-xs font-medium uppercase tracking-wider text-accent">{nickname}</p>
            )}
            <p className="mt-1 text-sm text-stext">
              {[role, player.nationality, player.birth ? `Born ${player.birth}` : null].filter(Boolean).join(' • ')}
            </p>
            {(player.battingStyle || player.bowlingStyle) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {player.battingStyle && (
                  <span className="rounded border border-lborder bg-secondary px-2.5 py-1 text-xs font-medium text-mtext">
                    Batting: <span className="text-accent">{player.battingStyle}</span>
                  </span>
                )}
                {player.bowlingStyle && (
                  <span className="rounded border border-lborder bg-secondary px-2.5 py-1 text-xs font-medium text-mtext">
                    Bowling: <span className="text-accent">{player.bowlingStyle}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {team && (
            <div className="flex shrink-0 items-center">
              <Link
                href={`/teams/${team.id}`}
                className="group flex items-center gap-3 rounded-md border border-lborder bg-secondary px-3.5 py-3 transition-colors hover:border-accent/50 hover:bg-elevated"
              >
                {team.logoUrl ? (
                  <img src={team.logoUrl} alt={team.name} className="h-11 w-11 rounded-full border border-white/10 bg-white object-contain p-0.5" />
                ) : (
                  <TeamLogo teamId={team.id} name={team.name} code={team.abbr} size="sm" link={false} />
                )}
                <div>
                  <p className="text-xs font-normal uppercase tracking-wider text-stext">Team</p>
                  <p className="text-sm font-semibold text-mtext transition-colors group-hover:text-accent">{team.abbr || team.name}</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard compact label="Player ID" value={String(player.id || '').split(':').pop() || '—'} sub="Provider id" icon={User} />
        <StatCard compact label="Role" value={role} sub="Squad" />
        <StatCard compact label="Nationality" value={player.nationality || '—'} />
        {player.birth && <StatCard compact label="Born" value={player.birth} sub="Date of birth" icon={Calendar} />}
      </div>

      <Tabs tabs={playerTabs} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard compact label="Short Name" value={player.shortName || '—'} sub="Preferred" />
          <StatCard compact label="Batting" value={player.battingStyle || '—'} sub="Style" />
          <StatCard compact label="Bowling" value={player.bowlingStyle || '—'} sub="Style" tone="accent" />
          <StatCard compact label="Team" value={team?.abbr || '—'} sub="Franchise" tone="gold" />
        </div>
      )}

      {tab === 'recent' && (
        <div className="fade-in">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-mtext">
            <Target size={18} className="text-accent" /> Recent Matches
          </h3>
          {player.recentMatches && player.recentMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
