'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Calendar, Clock, MapPin, Users } from 'lucide-react';
import Badge from '../Badge';
import LiveIndicator from '../LiveIndicator';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import ShareButton from '../ShareButton';
import { formatScheduled } from '../../utils/helpers';

const detailTabs = [
  { key: 'live', label: 'Live Score', icon: Users },
  { key: 'info', label: 'Match Info', icon: MapPin },
];

interface Props {
  match: any;
}

export default function MatchDetailBody({ match }: Props) {
  const [tab, setTab] = useState('live');

  if (!match) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Match not found" message="We couldn't find that match. It may have been moved or removed." />
      </div>
    );
  }

  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';

  const codes = match.teams || [];
  const names = match.teamNames || [];
  const homeCode = codes[0] || '';
  const awayCode = codes[1] || '';
  const homeName = names[0] || homeCode;
  const awayName = names[1] || awayCode;

  const inn = match.currentInnings;
  const battingCode = inn?.battingTeam;
  const battingIsHome = battingCode === homeCode;

  const homeScore = isUpcoming || (isLive && battingIsHome) ? match.displayScore : '';
  const awayScore = isUpcoming || (isLive && !battingIsHome) ? match.displayScore : '';
  const homeOvers = homeScore ? inn?.overs : '';
  const awayOvers = awayScore ? inn?.overs : '';

  const { date, time } = formatScheduled(match.scheduled);

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/matches" className="hover:text-accent">Matches</Link>
        <span>/</span>
        <span className="text-mtext">{match.matchId || 'Match'}</span>
      </nav>

      <header className="rounded-3xl bg-card p-6 ring-1 ring-lborder">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="upcoming">{match.tournament || 'Match'}</Badge>
            <span className="text-xs text-stext">{match.matchStatus || match.status}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton
              title={`${homeName} vs ${awayName}`}
              text={`${match.tournament || 'Cricket'} — ${homeCode} vs ${awayCode}`}
            />
            {isLive ? (
              <LiveIndicator />
            ) : isUpcoming ? (
              <Badge tone="upcoming">Upcoming</Badge>
            ) : (
              <Badge tone="completed">Completed</Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <TeamSide
            code={homeCode}
            name={homeName}
            score={homeScore}
            overs={homeOvers}
            align="left"
          />

          <div className="hidden rounded-full bg-elevated px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-stext sm:block">
            vs
          </div>

          <TeamSide
            code={awayCode}
            name={awayName}
            score={awayScore}
            overs={awayOvers}
            align="right"
          />
        </div>

        {!isUpcoming && (
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-lborder pt-4 text-xs text-stext">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={14} /> {battingCode || '—'} {inn?.runs ?? 0}/{inn?.wickets ?? 0}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={14} /> {inn?.overs ?? 0} ov · RR {inn?.runRate ?? 0}
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

      <div className="mt-6">
        <Tabs tabs={detailTabs} active={tab} onChange={setTab} />
      </div>

      <div className="fade-in space-y-6 pt-5">
        {tab === 'live' &&
          (isLive ? (
            <div className="rounded-3xl bg-secondary p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-lg font-bold text-mtext">Live Score</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <InfoStat label="Score" value={`${battingCode || '—'} ${match.displayScore || '—'}`} big />
                <InfoStat label="Overs" value={inn?.overs != null ? String(inn.overs) : '—'} />
                <InfoStat label="Run Rate" value={inn?.runRate != null ? String(inn.runRate) : '—'} />
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
              title="Match completed"
              message={`${match.matchStatus || 'This match has finished.'} Full scorecards are not available for this fixture.`}
            />
          ))}

        {tab === 'info' && (
          <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Match Details</h3>
            <InfoRow label="Match ID" value={match.matchId} />
            <InfoRow label="Tournament" value={match.tournament} />
            <InfoRow label="Status" value={`${match.status} · ${match.matchStatus || ''}`} cap />
            <InfoRow label="Home" value={`${homeName} (${homeCode})`} />
            <InfoRow label="Away" value={`${awayName} (${awayCode})`} />
            {date && <InfoRow label="Date" value={date} />}
            {time && <InfoRow label="Time" value={time} />}
            <InfoRow label="Venue" value={match.venue || 'TBA'} />
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSide({ code, name, score, overs, align }: { code: string; name: string; score: string; overs: string | number; align: string }) {
  const right = align === 'right';
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-4 ${right ? 'flex-row-reverse justify-end text-right' : ''}`}>
      <TeamCode code={code} name={name} />
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-mtext sm:text-lg">{name}</p>
        <p className="text-xs text-stext">{code}</p>
        {score ? (
          <div className={`mt-1 flex items-baseline gap-2 ${right ? 'justify-end' : ''}`}>
            <span className="font-mono text-2xl font-black tabular-nums text-mtext sm:text-3xl">
              {score}
            </span>
            {overs && <span className="font-mono text-xs text-stext">{overs} ov</span>}
          </div>
        ) : (
          <p className="text-sm text-stext">—</p>
        )}
      </div>
    </div>
  );
}

function TeamCode({ code, name }: { code: string; name: string }) {
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-accent bg-primary text-sm font-extrabold tracking-tight text-accent" title={name}>
      {(name || code || '??').replace(/^(\w)\w*\s?(\w)?.*$/, '$1$2').toUpperCase() || (code || '??').slice(0, 2).toUpperCase()}
    </span>
  );
}

function InfoStat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
      <p className="text-[11px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className={`font-mono font-black tabular-nums text-mtext ${big ? 'text-3xl' : 'text-2xl'}`}>{value}</p>
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
