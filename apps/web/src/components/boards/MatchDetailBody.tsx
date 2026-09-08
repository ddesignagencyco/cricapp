'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Calendar, Clock, MapPin, Trophy, Users } from 'lucide-react';
import Badge from '../Badge';
import LiveIndicator from '../LiveIndicator';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import HeadToHeadWidget from '../HeadToHeadWidget';
import TeamLogo from '../TeamLogo';
import { formatScheduled } from '../../utils/helpers';

const detailTabs = [
  { key: 'live', label: 'Live Score', icon: Users },
  { key: 'info', label: 'Match Info', icon: MapPin },
];

const completedTabs = [
  { key: 'info', label: 'Match Info', icon: MapPin },
  { key: 'result', label: 'Result', icon: Trophy },
];

interface Props {
  match: any;
  headToHead?: any;
}

export default function MatchDetailBody({ match, headToHead }: Props) {
  const isLive = match?.status === 'live';
  const isUpcoming = match?.status === 'upcoming';
  const isCompleted = match?.status === 'completed';
  const isCancelled = match?.status === 'cancelled';

  const [tab, setTab] = useState(isCompleted || isCancelled ? 'info' : 'live');
  const activeTabs = isCompleted || isCancelled ? completedTabs : detailTabs;

  if (!match) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Match not found" message="We couldn't find that match. It may have been moved or removed." />
      </div>
    );
  }

  const codes = match.teams || [];
  const names = match.teamNames || [];
  const homeCode = codes[0] || '';
  const awayCode = codes[1] || '';
  const homeName = (names[0] && !names[0].startsWith('sr:')) ? names[0] : homeCode || 'Team A';
  const awayName = (names[1] && !names[1].startsWith('sr:')) ? names[1] : awayCode || 'Team B';

  const inn = match.currentInnings;
  const battingCode = inn?.battingTeam;
  const battingIsHome = battingCode === homeCode;
  const hasInnings = inn && (inn.runs > 0 || inn.wickets > 0 || inn.overs > 0);

  let homeScore = '';
  let awayScore = '';
  let homeOvers: string | number = '';
  let awayOvers: string | number = '';

  if (isUpcoming) {
    homeScore = '';
    awayScore = '';
  } else if (isLive && hasInnings) {
    if (battingIsHome) {
      homeScore = match.displayScore || '';
      homeOvers = inn.overs;
    } else {
      awayScore = match.displayScore || '';
      awayOvers = inn.overs;
    }
  } else if (isCompleted && match.displayScore) {
    if (battingIsHome) {
      homeScore = match.displayScore;
      homeOvers = inn?.overs ?? '';
    } else if (battingCode) {
      awayScore = match.displayScore;
      awayOvers = inn?.overs ?? '';
    }
  }

  const { date, time } = formatScheduled(match.scheduled);

  const breadcrumbName = (isCompleted || isCancelled)
    ? `${homeName} vs ${awayName}`
    : match.matchId?.replace(/^sr:match:/, 'Match #') || 'Match';

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/matches" className="hover:text-accent transition-colors">Matches</Link>
        <span>/</span>
        <span className="text-mtext truncate max-w-[200px] sm:max-w-none font-medium">{breadcrumbName}</span>
      </nav>

      <header className="relative overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-lborder shadow-lg transition-all hover:shadow-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-accent2 via-accent to-accent2 opacity-80" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="upcoming">{match.tournament || 'Match'}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {isLive ? (
              <LiveIndicator />
            ) : isUpcoming ? (
              <Badge tone="upcoming">Upcoming</Badge>
            ) : isCancelled ? (
              <Badge tone="cancelled">Cancelled</Badge>
            ) : (
              <Badge tone="completed">Completed</Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-6">
          <div className="flex min-w-0 flex-1 justify-start">
            <TeamSide
              code={homeCode}
              name={homeName}
              score={homeScore}
              overs={homeOvers}
              align="left"
            />
          </div>

          <div className="flex shrink-0 justify-center">
            <div className="rounded-full bg-elevated px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-stext sm:px-4 sm:py-1.5 sm:text-xs">
              vs
            </div>
          </div>

          <div className="flex min-w-0 flex-1 justify-end">
            <TeamSide
              code={awayCode}
              name={awayName}
              score={awayScore}
              overs={awayOvers}
              align="right"
            />
          </div>
        </div>

        {hasInnings && (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-lborder pt-4 text-xs text-stext">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={14} /> {battingCode || '—'} {inn.runs}/{inn.wickets}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} /> {inn.overs} ov · RR {inn.runRate}
            </span>
            {match.lastEvent?.type && match.lastEvent.type !== 'none' && (
              <span className="flex items-center gap-1.5">
                Last: {match.lastEvent.type} +{match.lastEvent.runs ?? 0}
              </span>
            )}
          </div>
        )}

        {(date || time) && (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-lborder pt-4 text-xs text-stext">
            {date && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {date}
              </span>
            )}
            {time && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {time}
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} /> {match.venue}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="mt-4">
        <Tabs tabs={activeTabs} active={tab} onChange={setTab} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 fade-in space-y-6 pt-3">
          {tab === 'live' &&
            (isLive && hasInnings ? (
              <div className="rounded-3xl bg-secondary p-6 ring-1 ring-lborder">
                <h3 className="mb-4 text-lg font-bold text-mtext">Live Score</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <InfoStat label="Score" value={`${battingCode || '—'} ${match.displayScore || '—'}`} big />
                  <InfoStat label="Overs" value={String(inn.overs)} />
                  <InfoStat label="Run Rate" value={String(inn.runRate)} />
                </div>
                {match.lastEvent && (
                  <p className="mt-4 text-xs text-stext">
                    Last ball: over {match.lastEvent.over}, {match.lastEvent.runs} run
                    {match.lastEvent.runs === 1 ? '' : 's'} · {match.lastEvent.type}
                  </p>
                )}
              </div>
            ) : isUpcoming ? (
              <EmptyState
                title="This match hasn't started yet"
                message={`${homeName} vs ${awayName}${date ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}.`}
              />
            ) : (
              <EmptyState
                title="No Live Data"
                message={match.status || (isCompleted || isCancelled ? 'This match has finished or was cancelled.' : 'No live data available.')}
              />
            ))}

          {tab === 'info' && (
            <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Match Details</h3>
              <InfoRow label="Tournament" value={match.tournament || '—'} />
              <InfoRow label="Status" value={`${match.status || '—'}`} cap />
              <InfoRow label="Home" value={homeName} />
              <InfoRow label="Away" value={awayName} />
              {date && <InfoRow label="Date" value={date} />}
              {time && <InfoRow label="Time" value={time} />}
              <InfoRow label="Venue" value={match.venue || 'TBA'} />
            </div>
          )}

          {tab === 'result' && (isCompleted || isCancelled) && (
            <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Match Result</h3>
              {match.displayScore ? (
                <div className="rounded-xl bg-elevated p-4 ring-1 ring-lborder">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-stext mb-2">Final Score</p>
                  <p className="font-mono text-2xl font-black tabular-nums text-mtext">{match.displayScore}</p>
                </div>
              ) : (
                <p className="text-sm text-stext">No final score available.</p>
              )}
            </div>
          )}
        </div>

        <aside className="lg:col-span-1 mt-3">
          <HeadToHeadWidget data={headToHead || null} />
        </aside>
      </div>
    </div>
  );
}

function TeamSide({ code, name, score, overs, align }: { code: string; name: string; score: string; overs: string | number; align: string }) {
  const right = align === 'right';
  return (
    <div className={`flex min-w-0 items-center gap-3 sm:gap-5 ${right ? 'flex-row-reverse justify-end text-right' : 'justify-start text-left'}`}>
      <TeamLogo code={code} name={name} size="md" className="h-12 w-12 sm:h-16 sm:w-16" link={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-mtext sm:text-xl tracking-tight">{name}</p>
        {score ? (
          <div className={`mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0 ${right ? 'justify-end' : 'justify-start'}`}>
            <span className="font-mono text-2xl font-black tabular-nums leading-tight text-accent sm:text-4xl tracking-tighter">
              {score}
            </span>
            {overs && <span className="font-mono text-[11px] font-bold text-stext sm:text-sm">{overs} ov</span>}
          </div>
        ) : (
          <p className="text-sm text-stext">—</p>
        )}
      </div>
    </div>
  );
}

function InfoStat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className={`mt-1 font-mono font-black tabular-nums tracking-tighter text-accent ${big ? 'text-4xl' : 'text-3xl'}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value, cap = false }: { label: string; value: string; cap?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-lborder/60 px-1 py-2.5 last:border-0">
      <span className="text-xs uppercase tracking-wider text-stext">{label}</span>
      <span className={`text-right text-sm font-semibold ${cap ? 'capitalize text-mtext' : 'text-mtext'}`}>
        {value}
      </span>
    </div>
  );
}
