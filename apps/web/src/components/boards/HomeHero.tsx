'use client';

import Link from 'next/link';
import { ArrowRight, Activity, Flame } from 'lucide-react';
import LiveIndicator from '../LiveIndicator';
import { formatScheduled } from '../../utils/helpers';

interface Props {
  matches?: any[];
}

export default function HomeHero({ matches = [] }: Props) {
  const live = matches.filter((m) => m.status === 'live');
  const featured = live[0] || null;
  const others = live.slice(1, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="lg:col-span-3">
        {featured ? (
          <Link
            href={`/matches/${featured.matchId}`}
            className="group relative block overflow-hidden rounded-3xl bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:ring-accent/40"
          >
            <div className="hero-grad absolute inset-0 opacity-60" />
            <div className="relative z-10 p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-accent">
                  <Activity size={13} /> Live Now
                </span>
                <LiveIndicator label="LIVE" />
              </div>

              <h3 className="mt-5 text-base font-bold text-stext">
                {featured.tournament || 'Cricket'}
              </h3>

              <FeaturedSide
                name={featured.teamNames?.[0] || featured.teams?.[0] || 'Team A'}
                code={featured.teams?.[0] || '—'}
                score={
                  footerInnings(featured, featured.teams?.[0])
                    ? featured.displayScore
                    : ''
                }
              />
              <FeaturedSide
                name={featured.teamNames?.[1] || featured.teams?.[1] || 'Team B'}
                code={featured.teams?.[1] || '—'}
                score={
                  footerInnings(featured, featured.teams?.[1])
                    ? featured.displayScore
                    : ''
                }
                muted={footerInnings(featured, featured.teams?.[0])}
              />

              <div className="mt-5 border-t border-lborder pt-4">
                <p className="text-sm font-semibold text-accent">
                  {featured.currentInnings?.battingTeam || featured.teams?.[0]}{' '}
                  {featured.currentInnings?.runs ?? 0}/{featured.currentInnings?.wickets ?? 0}
                  <span className="ml-2 font-mono text-xs text-stext">
                    ({featured.currentInnings?.overs ?? 0} ov · RR {featured.currentInnings?.runRate ?? 0})
                  </span>
                </p>
                {featured.lastEvent && (
                  <p className="mt-1 text-xs text-stext">
                    Last ball: {featured.lastEvent.type || featured.lastEvent.over} —{' '}
                    {featured.lastEvent.runs} run{featured.lastEvent.runs === 1 ? '' : 's'}
                  </p>
                )}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  Match Centre <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl bg-card/60 p-10 text-center ring-1 ring-lborder">
            <p className="text-stext">No live matches at the moment.</p>
            <Link href="/matches" className="mt-3 inline-block text-sm font-semibold text-accent hover:text-accent2">
              See incoming matches <ArrowRight size={14} className="inline" />
            </Link>
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        {others.length > 0 && (
          <div className="flex h-full flex-col gap-3">
            {others.map((m) => (
              <MiniScoreCard key={m.matchId} match={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function footerInnings(match: any, code: string) {
  return match.currentInnings?.battingTeam === code;
}

function FeaturedSide({ name, code, score, muted = false }: { name: string; code: string; score: string; muted?: boolean }) {
  return (
    <div className={`mt-4 flex items-center justify-between gap-4 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-accent bg-primary text-[13px] font-extrabold text-accent">
          {abbr(name || code)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-mtext sm:text-lg">{name}</p>
          <p className="text-xs text-stext">{code}</p>
        </div>
      </div>
      {score ? (
        <span className="font-mono text-2xl font-extrabold tabular-nums text-mtext">{score}</span>
      ) : (
        <span className="text-xs font-semibold uppercase tracking-wider text-stext">Yet to bat</span>
      )}
    </div>
  );
}

function MiniScoreCard({ match }: { match: any }) {
  const { date, time } = formatScheduled(match.scheduled);
  const inn = match.currentInnings;
  return (
    <Link
      href={`/matches/${match.matchId}`}
      className="group flex items-center justify-between gap-3 rounded-2xl bg-card p-4 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <LiveIndicator label="LIVE" />
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-stext">
            {match.tournament || 'Cricket'}
          </span>
        </div>
        <p className="mt-1.5 truncate text-sm font-bold text-mtext">
          {(match.teamNames || []).join(' vs ')}
        </p>
        <p className="mt-0.5 text-[11px] text-stext">
          {inn
            ? `${inn.battingTeam || ''} ${inn.runs ?? 0}/${inn.wickets ?? 0} (${inn.overs ?? 0} ov)`
            : `${date} • ${time}`}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-accent/10 p-2 text-accent">
        <Flame size={16} />
      </span>
    </Link>
  );
}

function abbr(name: string) {
  return (name || '')
    .replace(/^(\w)\w*\s?(\w)?.*$/, '$1$2')
    .toUpperCase()
    .slice(0, 3);
}
