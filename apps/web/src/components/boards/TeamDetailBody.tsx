'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Shield, User } from 'lucide-react';
import MatchCard from '../MatchCard';
import PlayerCard from '../PlayerCard';
import Badge from '../Badge';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import { getInitials } from '../../utils/helpers';

const teamTabs = [
  { key: 'overview', label: 'Overview', icon: Shield },
  { key: 'matches', label: 'Matches', icon: CalendarDays },
  { key: 'squad', label: 'Squad', icon: User },
];

interface Props {
  team: any;
  players: any[];
  matches: any[];
}

export default function TeamDetailBody({ team, players, matches }: Props) {
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

      <header className="relative overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-lborder sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          {team.logoUrl ? (
            <img
              src={team.logoUrl}
              alt={team.name}
              className="h-20 w-20 shrink-0 rounded-full border-2 border-accent object-cover"
            />
          ) : (
            <TeamMark name={team.name} code={code} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{team.name}</h1>
            </div>
            {code && (
              <p className="mt-1 text-sm font-semibold uppercase tracking-wider text-stext">
                {code}
              </p>
            )}
            {team.country && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-stext">
                <MapPin size={14} /> {team.country}
              </p>
            )}
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
    </div>
  );
}

function TeamMark({ name, code }: { name: string; code: string }) {
  return (
    <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 border-accent bg-primary text-2xl font-extrabold tracking-tight text-accent" title={name}>
      {getInitials(name || code)}
    </span>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
      <p className="text-[11px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-mtext" title={value}>{value}</p>
    </div>
  );
}
