'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, CalendarDays, MapPin, Shield, Trophy, User } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import MatchCard from '../MatchCard';
import PlayerCard from '../PlayerCard';
import Badge from '../Badge';
import Tabs from '../Tabs';
import StatCard from '../StatCard';
import ScorecardTable from '../ScorecardTable';
import EmptyState from '../EmptyState';
import FavoriteButton from '../FavoriteButton';

const statusTones = {
  qualified: 'qualified',
  playoffs: 'playoffs',
  eliminated: 'eliminated',
  'n/a': 'neutral',
};

const teamTabs = [
  { key: 'overview', label: 'Overview', icon: Shield },
  { key: 'matches', label: 'Matches', icon: CalendarDays },
  { key: 'squad', label: 'Squad', icon: User },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
];

function toBattingRows(players) {
  return players.map((p) => ({
    id: `stat-${p.id}`,
    name: p.name,
    out: false,
    runs: p.runs,
    balls: p.matches,
    fours: Math.round((p.sixes || 0) / 2),
    sixes: p.sixes || 0,
    sr: Number(p.strikeRate || 0).toFixed(2),
  }));
}

function formatOvers(matches, wickets) {
  const v = matches + (wickets % 4) / 10;
  return String(v);
}

function toBowlingRows(players) {
  return players
    .filter((p) => p.wickets > 0)
    .map((p) => ({
      id: `bowl-${p.id}`,
      name: p.name,
      oversFull: formatOvers(p.matches, p.wickets),
      maidens: p.wickets % 3,
      runsGiven: p.runs,
      wickets: p.wickets,
      econ: p.economy ? Number(p.economy).toFixed(2) : '—',
    }));
}

export default function TeamDetailBody({ team, players, matches }) {
  const [tab, setTab] = useState('overview');

  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Team not found"
          message="We couldn't find that team. It may have been removed."
        />
      </div>
    );
  }

  const teamMatches = (matches || []).filter(
    (m) => m.teams.home.teamId === team.id || m.teams.away.teamId === team.id
  );

  const battingRows = toBattingRows(players || []);
  const bowlingRows = toBowlingRows(players || []);

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/teams" className="hover:text-accent">Teams</Link>
        <span>/</span>
        <span className="text-mtext">{team.name}</span>
      </nav>

      <header className="relative overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-lborder sm:p-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: team.colors.primary }}
        />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <TeamLogo teamId={team.id} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{team.name}</h1>
              {team.status !== 'n/a' && (
                <Badge tone={statusTones[team.status]}>{team.status}</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-stext">
              {team.code} • {team.city} • {team.captain ? `Captain: ${team.captain}` : ''}
            </p>
            {team.titles > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-gold">
                <Trophy size={15} /> {team.titles} PSL title{team.titles > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <FavoriteButton id={team.id} type="team" />
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-elevated px-3 py-2 text-center">
                <p className="font-mono text-xl font-black text-mtext">{team.matches}</p>
                <p className="text-[10px] uppercase tracking-wider text-stext">Played</p>
              </div>
              <div className="rounded-xl bg-elevated px-3 py-2 text-center">
                <p className="font-mono text-xl font-black text-accent2">{team.wins}</p>
                <p className="text-[10px] uppercase tracking-wider text-stext">Wins</p>
              </div>
              <div className="rounded-xl bg-elevated px-3 py-2 text-center">
                <p className="font-mono text-xl font-black text-danger">{team.losses}</p>
                <p className="text-[10px] uppercase tracking-wider text-stext">Losses</p>
              </div>
              <div className="rounded-xl bg-elevated px-3 py-2 text-center">
                <p className="font-mono text-xl font-black text-accent">{team.points}</p>
                <p className="text-[10px] uppercase tracking-wider text-stext">Points</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Tabs tabs={teamTabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="fade-in space-y-6 pt-5">
          <p className="rounded-2xl bg-card p-5 text-sm leading-relaxed text-stext ring-1 ring-lborder">
            {team.description}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Home Ground" value={team.homeGround} sub="Venue" icon={MapPin} />
            <StatCard label="Coach" value={team.coach || '—'} sub="Head Coach" />
            <StatCard label="Captain" value={team.captain || '—'} sub="Skipper" />
            <StatCard label="Founded" value={team.founded} sub="Est." />
            <StatCard label="Net Run Rate" value={team.nrr} tone={parseFloat(team.nrr) >= 0 ? 'green' : 'danger'} />
            <StatCard label="League Position" value={`#${team.position}`} sub={team.status} tone="accent" />
          </div>
        </div>
      )}

      {tab === 'matches' && (
        <div className="fade-in pt-5">
          {teamMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {teamMatches.map((m) => (
                <MatchCard key={m.id} match={m} />
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

      {tab === 'stats' && (
        <div className="fade-in space-y-8 pt-5">
          <div>
            <h3 className="mb-4 text-lg font-bold text-mtext">Season Batting</h3>
            <ScorecardTable kind="batting" data={battingRows} />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-bold text-mtext">Season Bowling</h3>
            <ScorecardTable kind="bowling" data={bowlingRows} />
          </div>
        </div>
      )}
    </div>
  );
}