'use client';

import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { StatusBadge } from '../Badge';
import LiveIndicator from '../LiveIndicator';
import AdSlot from '../AdSlot';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import Tabs from '../Tabs';
import { APP_TIME_ZONE, getPslLogo, toKarachiISODate } from '../../utils/helpers';
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
    date: toKarachiISODate(d),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: APP_TIME_ZONE }),
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
  errorMessage?: string | null;
  onRetry?: () => void;
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
  errorMessage,
  onRetry,
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
  const goToToday = () => onDateChange(toKarachiISODate());

  const isToday = date === toKarachiISODate();

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-accent">Fixtures & results</p>
          <h1 className="mt-1 text-2xl font-semibold text-mtext">Cricket Match Schedule</h1>
          <p className="mt-1 text-sm text-stext">
            Daily fixtures, live scorecards and verified match results.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="flex items-center gap-1 rounded-md border border-lborder bg-card p-1">
            <button
              type="button"
              onClick={prevDate}
              className="grid h-8 w-8 place-items-center rounded text-stext transition-colors hover:bg-elevated hover:text-accent"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>

            <label className="relative flex min-w-[150px] cursor-pointer flex-col items-center px-2">
              <span className="text-sm font-medium text-mtext">{formatDateDisplay(date)}</span>
              <span className="text-xs text-stext">{isToday ? 'Today' : 'Match day'}</span>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Select date"
              />
            </label>

            <button
              type="button"
              onClick={nextDate}
              className="grid h-8 w-8 place-items-center rounded text-stext transition-colors hover:bg-elevated hover:text-accent"
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => jumpDay(-1)}
              className="rounded border border-lborder bg-card px-2.5 py-1 text-xs font-medium text-stext transition-colors hover:bg-elevated hover:text-mtext"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={goToToday}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                isToday
                  ? 'btn-brand'
                  : 'border border-lborder bg-card text-accent hover:bg-accent/10'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => jumpDay(1)}
              className="rounded border border-lborder bg-card px-2.5 py-1 text-xs font-medium text-stext transition-colors hover:bg-elevated hover:text-mtext"
            >
              Tomorrow
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lborder pb-3">
        <Tabs tabs={tabs} active={tab} onChange={onTabChange} />
        <p className="text-xs text-stext">
          <span className="font-semibold text-mtext">{activeMeta.total || events.length}</span> matches
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-md border border-lborder bg-card"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : events.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {events.map((record) => (
              <ScheduleCard key={record.eventId} record={record} />
            ))}
          </div>
          <AdSlot slot="schedule-below-grid" format="leaderboard" className="pt-2" />
          <Pagination
            page={activeMeta.page}
            totalPages={activeMeta.totalPages}
            total={activeMeta.total}
            limit={activeMeta.limit}
            onPageChange={onPageChange}
          />
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

function TeamRow({
  code,
  name,
  score,
}: {
  code: string;
  name: string;
  score?: string | null;
}) {
  const pslLogo = getPslLogo(code);
  const label =
    (name || code || '??').replace(/^(\w)\w*\s?(\w)?.*$/, '$1$2').toUpperCase() ||
    (code || '??').slice(0, 2).toUpperCase();

  let hash = 0;
  for (let i = 0; i < (code || name).length; i++) {
    hash = (code || name).charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  return (
    <div className="flex items-center gap-2.5">
      {pslLogo ? (
        <img
          src={pslLogo}
          alt={name}
          className="h-7 w-7 shrink-0 rounded-full border border-lborder bg-white object-contain p-0.5"
        />
      ) : (
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 65%, 48%), hsl(${(hue + 28) % 360}, 75%, 32%))` }}
          title={name}
        >
          {label}
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-mtext" title={name}>
        {name}
      </p>
      {score !== null && score !== undefined && score !== '' && (
        <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-mtext">{score}</p>
      )}
    </div>
  );
}

/**
 * Provider payloads report one entry per innings and pad the side that did not
 * bat with 0, so a side's total is the sum of its innings rather than the first
 * entry. Returns an empty string when the side has no recorded runs.
 */
function sideTotal(
  scores: Array<Record<string, unknown>>,
  side: 'home' | 'away'
): string {
  let runs = 0;
  let wickets: number | null = null;
  let recorded = false;

  scores.forEach((inning) => {
    const value = Number(inning[`${side}_score`]);
    if (!Number.isNaN(value) && value > 0) {
      runs += value;
      recorded = true;
      const w = Number(inning[`${side}_wickets`]);
      if (!Number.isNaN(w) && w > 0) wickets = w;
    }
  });

  if (!recorded) return '';
  return wickets !== null ? `${runs}/${wickets}` : String(runs);
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
  const scores = (st.period_scores || []) as Array<Record<string, unknown>>;
  const winner = st.winner;

  const homeName = (home.name as string) || 'TBD';
  const awayName = (away.name as string) || 'TBD';
  const homeAbbr = (home.abbreviation as string) || (home.id as string)?.slice(-3) || '';
  const awayAbbr = (away.abbreviation as string) || (away.id as string)?.slice(-3) || '';
  const context = (ev.sport_event_context || {}) as Record<string, unknown>;
  const tournamentName =
    str(ev.tournament) ||
    str(context.competition) ||
    str(context.season) ||
    str(ev.season) ||
    'Match';
  const format = (tournament?.format as string) || '';
  const roundInfo = (ev.tournament_round || {}) as Record<string, unknown>;
  const roundNumber = Number(roundInfo.number);
  const round =
    (ev.round as string) || (Number.isNaN(roundNumber) ? '' : `Round ${roundNumber}`);
  const isLive = Boolean(coverage.live);
  const displayScore = (st.display_score as string) || '';
  const matchStatus = (st.match_status as string) || '';
  const result = (st.result as string) || (st.match_result_text as string) || '';
  const winnerName = !winner ? '' : typeof winner === 'string' ? winner : str(winner);
  const location = str(ev.venue) || [str(venue.city), str(venue.country)].filter(Boolean).join(', ');
  const { date: eventDate, time } = formatScheduled(record.scheduled);

  const homeScore = sideTotal(scores, 'home');
  const awayScore = sideTotal(scores, 'away');
  const outcome = result || (winnerName ? `${winnerName} won` : '');

  return (
    <div className="flex flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-elevated">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium uppercase tracking-wide text-stext" title={tournamentName}>
          {tournamentName || 'Match'}
        </p>
        {isLive ? (
          <LiveIndicator label="Live" className="shrink-0" />
        ) : matchStatus ? (
          <StatusBadge status={matchStatus} />
        ) : null}
      </div>

      <div className="space-y-1.5">
        <TeamRow code={homeAbbr} name={homeName} score={homeScore} />
        <TeamRow code={awayAbbr} name={awayName} score={awayScore} />
      </div>

      {(outcome || displayScore) && (
        <p className="mt-2.5 truncate text-xs font-medium text-mtext">
          {outcome || displayScore}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-lborder pt-2 text-xs text-stext">
        <span className="flex min-w-0 items-center gap-3">
          {eventDate && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} className="text-accent" />
              {eventDate}
            </span>
          )}
          {time && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {time}
            </span>
          )}
          {format && <span className="truncate">{format}</span>}
          {round && <span className="truncate">{round}</span>}
        </span>

        {location && (
          <span className="inline-flex max-w-[45%] items-center gap-1 truncate" title={location}>
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{location}</span>
          </span>
        )}
      </div>
    </div>
  );
}
