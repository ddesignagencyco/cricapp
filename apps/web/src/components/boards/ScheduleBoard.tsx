'use client';

import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import EmptyState from '../EmptyState';
import Tabs from '../Tabs';
import LiveIndicator from '../LiveIndicator';
import Badge from '../Badge';

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatScheduled(iso: string | undefined): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: toISODate(d),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

function getEventTeams(record: any): { homeName: string; awayName: string; homeAbbr: string; awayAbbr: string } {
  const payload = record?.payload || {};
  const event = payload.sport_event || payload;
  const comps = event.competitors || [];
  const home = comps.find((c: any) => c.qualifier === 'home') || comps[0] || {};
  const away = comps.find((c: any) => c.qualifier === 'away') || comps[1] || {};
  return {
    homeName: home.name || 'TBD',
    awayName: away.name || 'TBD',
    homeAbbr: home.abbreviation || home.id?.slice(-3) || '',
    awayAbbr: away.abbreviation || away.id?.slice(-3) || '',
  };
}

function getEventVenue(record: any): string {
  const payload = record?.payload || {};
  const event = payload.sport_event || payload;
  return event.venue?.name || event.venue || '';
}

function getEventTournament(record: any): string {
  const payload = record?.payload || {};
  const event = payload.sport_event || payload;
  return event.tournament?.name || '';
}

function getEventStatus(record: any): { status: string; result?: string } {
  const payload = record?.payload || {};
  const statusBlock = payload.sport_event_status || {};
  return {
    status: statusBlock.status || record.status || '',
    result: statusBlock.result || statusBlock.match_status || '',
  };
}

function getEventDisplayScore(record: any): string {
  const payload = record?.payload || {};
  const statusBlock = payload.sport_event_status || {};
  return statusBlock.display_score || '';
}

interface Props {
  date: string;
  schedule: any[];
  results: any[];
  onDateChange: (_date: string) => void;
}

export default function ScheduleBoard({ date, schedule, results, onDateChange }: Props) {
  const [tab, setTab] = useState('schedule');

  const tabs = useMemo(
    () => [
      { key: 'schedule', label: 'Schedule', count: schedule.length },
      { key: 'results', label: 'Results', count: results.length },
    ],
    [schedule.length, results.length]
  );

  const events = tab === 'schedule' ? schedule : results;

  const prevDate = () => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    onDateChange(toISODate(d));
  };

  const nextDate = () => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    onDateChange(toISODate(d));
  };

  const goToToday = () => {
    onDateChange(toISODate(new Date()));
  };

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Calendar size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Daily Schedule
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Schedule</h1>
        <p className="mt-2 text-sm text-stext">
          All matches scheduled or completed on any given day.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevDate}
            className="grid h-9 w-9 place-items-center rounded-lg bg-card text-stext ring-1 ring-lborder transition-colors hover:bg-elevated hover:text-mtext"
            aria-label="Previous day"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[180px] text-center">
            <p className="text-sm font-bold text-mtext">{formatDateDisplay(date)}</p>
            {date === toISODate(new Date()) && (
              <p className="text-[11px] font-semibold text-accent">Today</p>
            )}
          </div>
          <button
            type="button"
            onClick={nextDate}
            className="grid h-9 w-9 place-items-center rounded-lg bg-card text-stext ring-1 ring-lborder transition-colors hover:bg-elevated hover:text-mtext"
            aria-label="Next day"
          >
            <ChevronRight size={18} />
          </button>
          {date !== toISODate(new Date()) && (
            <button
              type="button"
              onClick={goToToday}
              className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/25 transition-colors hover:bg-accent/25"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <div className="mb-5">
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {events.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((record) => (
            <ScheduleCard key={record.eventId} record={record} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${tab === 'schedule' ? 'scheduled' : 'completed'} matches`}
          message={
            tab === 'schedule'
              ? 'No matches are scheduled for this date.'
              : 'No matches were completed on this date.'
          }
        />
      )}
    </>
  );
}

function TeamCode({ code, name }: { code: string; name: string }) {
  const label = (name || code || '??').replace(/^(\w)\w*\s?(\w)?.*$/, '$1$2').toUpperCase() || (code || '??').slice(0, 2).toUpperCase();

  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-[12px] font-black tracking-tight text-white shadow-sm"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${(hue + 40) % 360}, 90%, 40%))` }}
      title={name}
    >
      {label}
    </span>
  );
}

function ScheduleCard({ record }: { record: any }) {
  const { homeName, awayName, homeAbbr, awayAbbr } = getEventTeams(record);
  const venue = getEventVenue(record);
  const tournament = getEventTournament(record);
  const { date, time } = formatScheduled(record.scheduled);
  const eventStatus = getEventStatus(record);
  const displayScore = getEventDisplayScore(record);

  const isCompleted = eventStatus.status === 'closed' || eventStatus.status === 'ended' || eventStatus.result;
  const isLive = eventStatus.status === 'live' || eventStatus.status === 'inprogress';

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-4">
        {tournament ? (
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-widest text-accent" title={tournament}>
            {tournament}
          </span>
        ) : <span className="flex-1" />}
        <div className="shrink-0">
          {/* {isLive ? (
            <LiveIndicator />
          ) : isCompleted ? (
            <Badge tone="completed">Completed</Badge>
          ) : (
            <Badge tone="upcoming">Scheduled</Badge>
          )} */}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <TeamCode code={homeAbbr} name={homeName} />
          <p className="mt-2 w-full truncate text-[13px] font-bold text-mtext" title={homeName}>{homeName}</p>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center px-1">
          <span className="rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-stext">VS</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <TeamCode code={awayAbbr} name={awayName} />
          <p className="mt-2 w-full truncate text-[13px] font-bold text-mtext" title={awayName}>{awayName}</p>
        </div>
      </div>

      {displayScore && (
        <p className="mt-3 text-center font-mono text-[16px] font-black text-mtext">
          {displayScore}
        </p>
      )}

      {eventStatus.result && (
        <p className="mt-1 text-center text-[11px] font-semibold text-gold">
          {eventStatus.result}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-lborder/60 pt-3 text-[11px] font-semibold text-stext">
        {date && (
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            {date}
          </span>
        )}
        {time && (
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {time}
          </span>
        )}
        {venue && (
          <span className="flex items-center gap-1.5 truncate max-w-[120px]" title={venue}>
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{venue}</span>
          </span>
        )}
      </div>
    </div>
  );
}
