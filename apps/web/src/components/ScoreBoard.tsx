'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import BallTracker from './BallTracker';
import LiveIndicator from './LiveIndicator';
import TeamLogo from './TeamLogo';
import { formatRate } from '../utils/helpers';

interface ScoreBoardProps {
  match: any;
}

export default function ScoreBoard({ match }: ScoreBoardProps) {
  const { home } = match.teams;
  const batting = home;
  const bowler = match.bowler;
  const batsmen = match.batsmen || [];
  const target = match.target;
  const crr = match.currentRunRate;
  const rrr = match.requiredRunRate;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-card ring-1 ring-lborder">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lborder px-5 py-4">
        <div className="flex items-center gap-2">
          <LiveIndicator />
          <span className="text-sm font-semibold text-mtext">
            {match.tournamentName} \u2022 Match {match.matchNumber}
          </span>
        </div>
        <span className="text-xs text-stext">{match.venue}</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-5 py-5">
        <TeamLogo teamId={batting.teamId} name={batting.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-mtext">{batting.name}</p>
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-5xl font-black tabular-nums leading-none text-mtext sm:text-6xl">
              {batting.score}
            </span>
            <span className="font-mono text-sm text-stext">{batting.overs} overs</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-y border-lborder bg-lborder sm:grid-cols-4">
        <RateCell label="Target" value={target ? String(target) : '\u2014'} accent />
        <RateCell label="Current Run Rate" value={crr ? formatRate(crr) : '\u2014'} />
        <RateCell label="Required Run Rate" value={rrr ? formatRate(rrr) : '\u2014'} />
        <RateCell label="Partnership" value={match.partnership ? `${match.partnership.runs} (${match.partnership.balls})` : '\u2014'} />
      </div>

      <div className="grid grid-cols-1 gap-6 border-b border-lborder p-5 sm:grid-cols-2">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stext">
            Batsmen
          </p>
          <div className="space-y-2">
            {batsmen.slice(0, 2).map((b: any) => (
              <div
                key={b.name}
                className="flex items-center justify-between rounded-xl bg-elevated/60 px-3 py-2"
              >
                <span className="text-sm font-medium text-mtext">{b.name}</span>
                <span className="font-mono text-base font-bold tabular-nums text-mtext">
                  {b.runs} ({b.balls})
                  {b.status?.toLowerCase().includes('not') ? '*' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {bowler && (
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stext">
              Current Bowler
            </p>
            <div className="rounded-xl bg-elevated/60 px-3 py-2">
              <p className="mb-1 text-sm font-medium text-mtext">{bowler.name}</p>
              <p className="font-mono text-sm font-semibold tabular-nums text-accent">
                {bowler.overs} - {bowler.maidens} - {bowler.runs} - {bowler.wickets}
              </p>
              <p className="font-mono text-[11px] text-stext">
                Econ: {formatRate(bowler.econ)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-5">
        <p className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-stext">
          Recent Balls
          <Link
            href={`/matches/${match.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold normal-case tracking-normal text-accent hover:text-accent2"
          >
            Full scorecard <ChevronRight size={14} />
          </Link>
        </p>
        <BallTracker balls={match.recentBalls || []} size="lg" />
      </div>
    </div>
  );
}

function RateCell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-stext">
        {label}
      </p>
      <p
        className={`font-mono text-lg font-bold tabular-nums ${
          accent ? 'text-accent2' : 'text-mtext'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
