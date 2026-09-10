'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Shield, Swords, User } from 'lucide-react';
import MatchCard from '../MatchCard';
import PlayerCard from '../PlayerCard';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import TeamHeadToHead from './TeamHeadToHead';
import TeamLogo from '../TeamLogo';
import FavoriteButton from '../FavoriteButton';
import ShareButton from '../ShareButton';

const teamTabs = [
  { key: 'overview', label: 'Overview', icon: Shield },
  { key: 'matches', label: 'Matches', icon: CalendarDays },
  { key: 'squad', label: 'Squad', icon: User },
  { key: 'h2h', label: 'Head to Head', icon: Swords },
];

interface Props {
  team: any;
  players: any[];
  matches: any[];
  allTeams?: any[];
}

export default function TeamDetailBody({ team, players, matches, allTeams = [] }: Props) {
  const [tab, setTab] = useState('overview');

  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Team not found" message="We couldn't find that team. It may have been removed." />
      </div>
    );
  }

  const code = team.abbr || '';
  const teamIdentifiers = [team.id, team.teamId, code, team.name]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  const teamMatches = (matches || []).filter((match) => {
    const teams = match.teams;
    const values = Array.isArray(teams)
      ? teams
      : teams && typeof teams === 'object'
        ? Object.values(teams).flatMap((side: any) => [
            side?.teamId,
            side?.id,
            side?.code,
            side?.name,
          ])
        : [];
    const names = Array.isArray(match.teamNames) ? match.teamNames : [];
    return [...values, ...names]
      .filter(Boolean)
      .some((value) => teamIdentifiers.includes(String(value).toLowerCase()));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/teams" className="hover:text-accent">Teams</Link>
        <span>/</span>
        <span className="text-mtext">{team.name}</span>
      </nav>

      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-lborder pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-accent">
              {team.country || 'Cricket Team'}
            </span>
            {code && (
              <span className="rounded border border-lborder bg-secondary px-2.5 py-1 font-mono text-xs font-medium uppercase tracking-wider text-stext">
                {code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton targetType="team" targetId={team.id || code} compact />
            <ShareButton
              type="team"
              id={team.id || code}
              fallbackTitle={team.name}
              compact
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="shrink-0">
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.name}
                  className="h-20 w-20 shrink-0 rounded-md border border-accent/30 bg-white object-contain p-1.5"
                />
              ) : (
                <TeamLogo teamId={team.teamId} name={team.name} code={code} size="xl" link={false} />
              )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-mtext">{team.name}</h1>
            {code && (
              <p className="mt-1 font-mono text-xs font-medium uppercase tracking-wider text-accent">
                {code} · Team profile
              </p>
            )}
            {team.country && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stext">
                <MapPin size={14} className="text-accent" /> {team.country}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="min-w-24 rounded-md border border-lborder bg-secondary px-3.5 py-3 text-center">
              <p className="font-mono text-lg font-semibold text-accent">{players?.length || 0}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-stext">Players</p>
            </div>
            <div className="min-w-24 rounded-md border border-lborder bg-secondary px-3.5 py-3 text-center">
              <p className="font-mono text-lg font-semibold text-mtext">{teamMatches.length}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-stext">Matches</p>
            </div>
          </div>
        </div>
      </header>

      <Tabs tabs={teamTabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="fade-in space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoStat label="Team ID" value={team.id} />
            <InfoStat label="Abbreviation" value={code || '—'} />
            <InfoStat label="Country" value={team.country || '—'} />
          </div>
          <p className="rounded-md border border-lborder bg-card p-4 text-sm leading-relaxed text-stext">
            No detailed description is available for this team yet.
          </p>
        </div>
      )}

      {tab === 'matches' && (
        <div className="fade-in">
          {teamMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {teamMatches.map((m) => (
                <MatchCard key={m.matchId} match={m} />
              ))}
            </div>
          ) : (
            <EmptyState title="No matches found" message="This team has no recorded matches yet." />
          )}
        </div>
      )}

      {tab === 'squad' && (
        <div className="fade-in">
          {players && players.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {players.map((p) => (
                <PlayerCard key={p.id} player={p} />
              ))}
            </div>
          ) : (
            <EmptyState title="No players" message="Squad information is not available yet." />
          )}
        </div>
      )}

      {tab === 'h2h' && (
        <div className="fade-in">
          <TeamHeadToHead team={team} allTeams={allTeams} teamMatches={teamMatches} />
        </div>
      )}
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-lborder bg-card p-3.5">
      <p className="text-xs font-medium uppercase tracking-wider text-stext">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-mtext" title={value}>{value}</p>
    </div>
  );
}
