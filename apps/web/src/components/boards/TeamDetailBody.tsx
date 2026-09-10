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
import Badge from '../Badge';
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
  const teamMatches = (matches || []).filter(
    (m) => (m.teams || []).includes(code)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/teams" className="hover:text-accent">Teams</Link>
        <span>/</span>
        <span className="text-mtext">{team.name}</span>
      </nav>

      <header className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-br from-card via-card to-elevated p-6 shadow-md sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative flex items-center justify-between border-b border-lborder/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-accent border border-accent/20">
              {team.country || 'Cricket Team'}
            </span>
            {code && (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-stext border border-lborder/60">
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

        <div className="relative mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-3xl bg-accent/20 blur-md group-hover:bg-accent/30 transition-all" />
            <div className="relative">
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.name}
                  className="h-20 w-20 shrink-0 rounded-3xl border-2 border-accent/30 bg-white object-contain p-1.5 shadow-lg shadow-black/20"
                />
              ) : (
                <TeamLogo teamId={team.teamId} name={team.name} code={code} size="xl" link={false} />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-mtext sm:text-4xl">{team.name}</h1>
            </div>
            {code && (
              <p className="mt-1 font-mono text-xs font-bold uppercase tracking-widest text-accent">
                {code} • Franchise Squad
              </p>
            )}
            {team.country && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stext">
                <MapPin size={14} className="text-accent" /> {team.country}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-lborder bg-secondary/80 px-4 py-3 text-center backdrop-blur-sm">
              <p className="font-mono text-xl font-black text-accent">{players?.length || 0}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-stext">Squad Size</p>
            </div>
            <div className="rounded-2xl border border-lborder bg-secondary/80 px-4 py-3 text-center backdrop-blur-sm">
              <p className="font-mono text-xl font-black text-mtext">{teamMatches?.length || 0}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-stext">Matches</p>
            </div>
          </div>
        </div>
      </header>

      <Tabs tabs={teamTabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="fade-in space-y-6 pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoStat label="Team ID" value={team.id} />
            <InfoStat label="Abbreviation" value={code || '—'} />
            <InfoStat label="Country" value={team.country || '—'} />
          </div>
          <p className="rounded-2xl bg-card p-5 text-sm leading-relaxed text-stext ring-1 ring-lborder">
            No detailed description is available for this team yet.
          </p>
        </div>
      )}

      {tab === 'matches' && (
        <div className="fade-in pt-5">
          {teamMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        <div className="fade-in pt-5">
          {players && players.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="fade-in pt-5">
          <TeamHeadToHead team={team} allTeams={allTeams} teamMatches={teamMatches} />
        </div>
      )}
    </div>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
      <p className="text-xs font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-mtext" title={value}>{value}</p>
    </div>
  );
}
