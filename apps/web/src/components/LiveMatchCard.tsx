'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import BallTracker from './BallTracker';
import LiveIndicator from './LiveIndicator';
import TeamLogo from './TeamLogo';

interface Props {
  match: any;
}

export default function LiveMatchCard({ match }: Props) {
  const { home, away } = match.teams;
  const batsman = match.batsmen?.[0];
  const bowler = match.bowler;

  return (
    <div className="relative overflow-hidden rounded-sm bg-card ring-1 ring-lborder">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stext">
            {match.tournamentName} • Match {match.matchNumber}
          </p>
          <p className="mt-0.5 text-xs text-stext">{match.venue}</p>
        </div>
        <LiveIndicator />
      </div>

      <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="flex items-center gap-3">
          <TeamLogo teamId={home.teamId} name={home.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-mtext">{home.name}</p>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stext">
              {home.code}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black tabular-nums text-mtext sm:text-4xl">
                {home.score}
              </span>
              {home.overs && (
                <span className="font-mono text-xs text-stext">{home.overs} ov</span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden justify-center sm:flex">
          <span className="rounded-full bg-elevated px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-stext">
            vs
          </span>
        </div>

        <div className="flex items-center gap-3">
          <TeamLogo teamId={away.teamId} name={away.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-mtext">{away.name}</p>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stext">
              {away.code}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-black tabular-nums text-mtext sm:text-4xl">
                {away.score}
              </span>
              {away.overs && (
                <span className="font-mono text-xs text-stext">{away.overs} ov</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-lborder p-5 sm:grid-cols-2 lg:grid-cols-3">
        {batsman && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stext">
              Current Batsman
            </p>
            <p className="text-sm font-semibold text-mtext">{batsman.name}</p>
            <p className="font-mono text-lg font-bold tabular-nums text-accent2">
              {batsman.runs} ({batsman.balls})*
            </p>
          </div>
        )}
        {bowler && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stext">
              Current Bowler
            </p>
            <p className="text-sm font-semibold text-mtext">{bowler.name}</p>
            <p className="font-mono text-sm font-medium tabular-nums text-stext">
              {bowler.overs} - {bowler.maidens} - {bowler.runs} - {bowler.wickets}
            </p>
          </div>
        )}
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-stext">
            Recent Balls
          </p>
          <BallTracker balls={match.recentBalls || []} size="sm" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-lborder px-5 py-4">
        <p className="text-sm font-semibold text-accent2">{match.result}</p>
        <Link
          href={`/matches/${match.id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-accent2"
        >
          View match <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
