'use client';

import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';
import Tabs from '../Tabs';
import { getPslLogo } from '../../utils/helpers';
import { str } from '../../utils/extract';
import type { SportEventRecord } from '../../types/index';
import type { PageMeta } from '../../services/api/client';

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

/* ─── Components ──────────────────────────────────────────── */

interface Props {
  date: string;
  schedule: SportEventRecord[];
  results: SportEventRecord[];
  scheduleMeta: PageMeta;
  resultsMeta: PageMeta;
  tab: string;
  onDateChange: (_date: string) => void;
  onTabChange: (_tab: string) => void;
  onSchedulePageChange: (_page: number) => void;
  onResultsPageChange: (_page: number) => void;
  loading?: boolean;
}

export default function ScheduleBoard({
  date,
  schedule,
  results,
  scheduleMeta,
  resultsMeta,
  tab,
  onDateChange,
  onTabChange,
  onSchedulePageChange,
  onResultsPageChange,
  loading,
}: Props) {
  const tabs = [
    { key: 'schedule', label: 'Schedule', count: scheduleMeta.total || schedule.length },
    { key: 'results', label: 'Results', count: resultsMeta.total || results.length },
  ];

  const events = tab === 'schedule' ? schedule : results;
  const activeMeta = tab === 'schedule' ? scheduleMeta : resultsMeta;
  const onPageChange = tab === 'schedule' ? onSchedulePageChange : onResultsPageChange;

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

  const goToToday = () => onDateChange(toISODate(new Date()));

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Calendar size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">Daily Schedule</span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Schedule</h1>
        <p className="mt-2 text-sm text-stext">All matches scheduled or completed on any given day.</p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevDate} className="grid h-9 w-9 place-items-center rounded-lg bg-card text-stext ring-1 ring-lborder transition-colors hover:bg-elevated hover:text-mtext" aria-label="Previous day">
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-[180px] text-center">
            <p className="text-sm font-bold text-mtext">{formatDateDisplay(date)}</p>
            {date === toISODate(new Date()) && <p className="text-[11px] font-semibold text-accent">Today</p>}
          </div>
          <button type="button" onClick={nextDate} className="grid h-9 w-9 place-items-center rounded-lg bg-card text-stext ring-1 ring-lborder transition-colors hover:bg-elevated hover:text-mtext" aria-label="Next day">
            <ChevronRight size={18} />
          </button>
          {date !== toISODate(new Date()) && (
            <button type="button" onClick={goToToday} className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/25 transition-colors hover:bg-accent/25">
              Today
            </button>
          )}
        </div>
      </div>

      <div className="mb-5">
        <Tabs tabs={tabs} active={tab} onChange={onTabChange} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl bg-card ring-1 ring-lborder" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((record) => (
              <ScheduleCard key={record.eventId} record={record} />
            ))}
          </div>
          <Pagination page={activeMeta.page} totalPages={activeMeta.totalPages} onPageChange={onPageChange} />
        </>
      ) : (
        <EmptyState
          title={`No ${tab === 'schedule' ? 'scheduled' : 'completed'} matches`}
          message={tab === 'schedule' ? 'No matches are scheduled for this date.' : 'No matches were completed on this date.'}
        />
      )}
    </>
  );
}

function TeamCode({ code, name }: { code: string; name: string }) {
  const pslLogo = getPslLogo(code);
  const label = (name || code || '??').replace(/^(\w)\w*\s?(\w)?.*$/, '$1$2').toUpperCase() || (code || '??').slice(0, 2).toUpperCase();

  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  if (pslLogo) {
    return <img src={pslLogo} alt={name} title={name} className="h-10 w-10 shrink-0 rounded-full border border-white/10 bg-white object-contain p-0.5" />;
  }

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

function ScheduleCard({ record }: { record: SportEventRecord }) {
  const p = record.payload || {};
  const ev = (p.sport_event || p) as Record<string, unknown>;
  const st = (p.sport_event_status || {}) as Record<string, unknown>;
  const comps = (ev.competitors || []) as Array<Record<string, unknown>>;
  const home = comps.find((c) => c.qualifier === 'home') || comps[0] || {};
  const away = comps.find((c) => c.qualifier === 'away') || comps[1] || {};
  const venue = (ev.venue || {}) as Record<string, unknown>;
  const tournament = ev.tournament as Record<string, unknown> | undefined;
  const coverage = (ev.coverage || {}) as Record<string, unknown>;
  const season = ev.season as Record<string, unknown> | undefined;
  const scores = (st.period_scores || []) as Array<Record<string, unknown>>;
  const winner = st.winner;

  const homeName = (home.name as string) || 'TBD';
  const awayName = (away.name as string) || 'TBD';
  const homeAbbr = (home.abbreviation as string) || (home.id as string)?.slice(-3) || '';
  const awayAbbr = (away.abbreviation as string) || (away.id as string)?.slice(-3) || '';
  const tournamentName = str(ev.tournament);
  const format = (tournament?.format as string) || '';
  const round = (ev.round as string) || '';
  const seasonLabel = season?.name ? str(season.name) : season?.year ? String(season.year) : '';
  const category = str(tournament?.category);
  const gender = (ev.gender as string) || '';
  const isLive = Boolean(coverage.live);
  const displayScore = (st.display_score as string) || '';
  const matchStatus = (st.match_status as string) || '';
  const result = (st.result as string) || (st.match_result_text as string) || '';
  const winnerName = !winner ? '' : typeof winner === 'string' ? winner : str(winner);
  const location = str(ev.venue) || [str(venue.city), str(venue.country)].filter(Boolean).join(', ');
  const { date: eventDate, time } = formatScheduled(record.scheduled);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:shadow-lg">
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {tournamentName ? <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-widest text-accent" title={tournamentName}>{tournamentName}</span> : <span className="flex-1" />}
          <div className="flex items-center gap-1.5">
            {format && <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stext">{format}</span>}
            {gender && <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stext">{gender === 'male' ? 'M' : gender === 'female' ? 'W' : gender}</span>}
            {isLive && <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">Live</span>}
          </div>
        </div>
        {(seasonLabel || category) && (
          <div className="flex items-center gap-2 text-[10px] font-semibold text-stext">
            {seasonLabel && <span>{seasonLabel}</span>}
            {seasonLabel && category && <span aria-hidden="true">|</span>}
            {category && <span>{category}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <TeamCode code={homeAbbr} name={homeName} />
          <p className="mt-2 w-full truncate text-[13px] font-bold text-mtext" title={homeName}>{homeName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center px-1">
          <span className="rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-stext">{displayScore || 'VS'}</span>
          {round && <span className="mt-1 text-[9px] font-semibold text-stext">{round}</span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <TeamCode code={awayAbbr} name={awayName} />
          <p className="mt-2 w-full truncate text-[13px] font-bold text-mtext" title={awayName}>{awayName}</p>
        </div>
      </div>

      {displayScore && <p className="mt-3 text-center font-mono text-[16px] font-black text-mtext">{displayScore}</p>}

      {scores.length > 0 && (
        <div className="mt-3 rounded-lg bg-elevated/50 px-3 py-2">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-widest text-stext">Innings</p>
          <div className="space-y-1">
            {scores.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] font-semibold text-mtext">
                <span className="text-stext">{(s.type as string) || `Innings ${i + 1}`}</span>
                <span>{String(s.home_score ?? '-')} vs {String(s.away_score ?? '-')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {winnerName && <p className="mt-2 text-center text-[11px] font-bold text-gold">{winnerName} won</p>}
      {result && !winnerName && <p className="mt-2 text-center text-[11px] font-semibold text-gold">{result}</p>}
      {matchStatus && matchStatus !== result && <p className="mt-1 text-center text-[10px] font-semibold capitalize text-stext">{matchStatus}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-lborder/60 pt-3 text-[11px] font-semibold text-stext">
        {eventDate && <span className="flex items-center gap-1.5"><Calendar size={13} />{eventDate}</span>}
        {time && <span className="flex items-center gap-1.5"><Clock size={13} />{time}</span>}
        {location && <span className="flex items-center gap-1.5 truncate max-w-[150px]" title={location}><MapPin size={13} className="shrink-0" /><span className="truncate">{location}</span></span>}
      </div>
    </div>
  );
}
