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

  const jumpDay = (offset: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    onDateChange(toISODate(d));
  };

  const prevDate = () => jumpDay(-1);
  const nextDate = () => jumpDay(1);
  const goToToday = () => onDateChange(toISODate(new Date()));

  const isToday = date === toISODate(new Date());

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-br from-card via-card to-elevated p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">
              <Calendar size={13} />
              <span>Fixtures & Match Results</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-mtext sm:text-4xl">
              Cricket Match Schedule
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stext sm:text-base">
              Real-time daily schedule, live cricket scorecards, upcoming international fixtures, and verified match results.
            </p>
          </div>

          {/* Quick Date Control Card */}
          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-lborder bg-secondary/80 p-1.5 shadow-inner backdrop-blur-md">
              <button
                type="button"
                onClick={prevDate}
                className="grid h-9 w-9 place-items-center rounded-xl bg-card text-stext shadow-sm transition-all hover:bg-elevated hover:text-accent cursor-pointer"
                title="Previous day"
              >
                <ChevronLeft size={18} />
              </button>

              <label className="relative flex flex-col items-center justify-center px-3 min-w-[170px] cursor-pointer group">
                <p className="text-xs font-black text-mtext sm:text-sm tracking-tight group-hover:text-accent transition-colors">
                  {formatDateDisplay(date)}
                </p>
                <span className="text-xs font-bold uppercase tracking-widest text-accent">
                  {isToday ? "Today's Fixtures" : 'Match Day'}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => e.target.value && onDateChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Select custom date"
                />
              </label>

              <button
                type="button"
                onClick={nextDate}
                className="grid h-9 w-9 place-items-center rounded-xl bg-card text-stext shadow-sm transition-all hover:bg-elevated hover:text-accent cursor-pointer"
                title="Next day"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Quick jump pills & calendar button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => jumpDay(-1)}
                className="rounded-xl border border-lborder bg-card px-3 py-1 text-xs font-bold text-stext hover:text-mtext hover:bg-secondary transition-all cursor-pointer shadow-xs"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={goToToday}
                className={`rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  isToday
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'border border-lborder bg-card text-accent hover:bg-accent/15'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => jumpDay(1)}
                className="rounded-xl border border-lborder bg-card px-3 py-1 text-xs font-bold text-stext hover:text-mtext hover:bg-secondary transition-all cursor-pointer shadow-xs"
              >
                Tomorrow
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-lborder/80 pb-4">
        <Tabs tabs={tabs} active={tab} onChange={onTabChange} />

        <div className="text-xs font-semibold text-stext">
          <span>{activeMeta.total || events.length} matches found</span>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-3xl border border-lborder bg-card p-5"
            />
          ))}
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((record) => (
              <ScheduleCard key={record.eventId} record={record} />
            ))}
          </div>
          <div className="pt-6">
            <Pagination
              page={activeMeta.page}
              totalPages={activeMeta.totalPages}
              onPageChange={onPageChange}
            />
          </div>
        </>
      ) : (
        <EmptyState
          title={`No ${tab === 'schedule' ? 'scheduled' : 'completed'} matches on this date`}
          message={
            tab === 'schedule'
              ? `No cricket matches are scheduled for ${formatDateDisplay(date)}. Use the date picker above to check upcoming fixtures.`
              : `No match results recorded for ${formatDateDisplay(date)}. Try checking previous days.`
          }
        />
      )}
    </div>
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
    <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-lborder bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-elevated hover:shadow-xl hover:shadow-accent/10">
      <div>
        {/* Tournament & Badges Row */}
        <div className="mb-4 flex items-center justify-between gap-2">
          {tournamentName ? (
            <span
              className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-wider text-accent"
              title={tournamentName}
            >
              {tournamentName}
            </span>
          ) : (
            <span className="flex-1" />
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {format && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">
                {format}
              </span>
            )}
            {isLive ? (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-red-500 ring-1 ring-red-500/30 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Live
              </span>
            ) : matchStatus ? (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-stext border border-lborder/60">
                {matchStatus}
              </span>
            ) : null}
          </div>
        </div>

        {/* Head-to-Head Visual Matchup */}
        <div className="my-3 flex items-center justify-between gap-2">
          {/* Home Side */}
          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <div className="relative mb-2">
              <TeamCode code={homeAbbr} name={homeName} />
            </div>
            <p className="w-full truncate text-xs font-bold text-mtext group-hover:text-accent transition-colors" title={homeName}>
              {homeName}
            </p>
          </div>

          {/* Center VS / Score Emblem */}
          <div className="flex shrink-0 flex-col items-center justify-center px-2">
            <span className="rounded-full border border-lborder bg-secondary px-3 py-1 font-mono text-xs font-black tracking-wider text-mtext">
              {displayScore || 'VS'}
            </span>
            {round && <span className="mt-1 text-xs font-semibold uppercase text-stext/80">{round}</span>}
          </div>

          {/* Away Side */}
          <div className="flex min-w-0 flex-1 flex-col items-center text-center">
            <div className="relative mb-2">
              <TeamCode code={awayAbbr} name={awayName} />
            </div>
            <p className="w-full truncate text-xs font-bold text-mtext group-hover:text-accent transition-colors" title={awayName}>
              {awayName}
            </p>
          </div>
        </div>

        {/* Winner / Status Callout */}
        {winnerName ? (
          <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-center">
            <p className="text-xs font-bold text-amber-500 truncate">{winnerName} won</p>
          </div>
        ) : result ? (
          <div className="mt-3 rounded-xl bg-accent/10 border border-accent/20 px-3 py-1.5 text-center">
            <p className="text-xs font-bold text-accent truncate">{result}</p>
          </div>
        ) : null}

        {/* Innings Breakdown Preview */}
        {scores.length > 0 && (
          <div className="mt-3 divide-y divide-lborder/60 rounded-xl bg-secondary/60 p-2.5 text-xs">
            {scores.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1 font-semibold text-mtext">
                <span className="text-stext">{(s.type as string) || `Innings ${i + 1}`}</span>
                <span className="font-mono">{String(s.home_score ?? '-')} - {String(s.away_score ?? '-')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fixture Meta Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-lborder/60 pt-3 text-xs text-stext">
        <div className="flex items-center gap-3">
          {eventDate && (
            <span className="flex items-center gap-1 font-medium">
              <Calendar size={12} className="text-accent" />
              {eventDate}
            </span>
          )}
          {time && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {time}
            </span>
          )}
        </div>

        {location && (
          <span className="flex items-center gap-1 truncate max-w-[140px]" title={location}>
            <MapPin size={11} className="text-accent shrink-0" />
            <span className="truncate">{location}</span>
          </span>
        )}
      </div>
    </div>
  );
}
