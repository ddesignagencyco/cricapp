'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { StatusBadge } from '../Badge';
import LiveIndicator from '../LiveIndicator';
import DummyAd from '../advertisements/DummyAd';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import PageToolbar from '../PageToolbar';
import Pagination from '../Pagination';
import Tabs from '../Tabs';
import RemoteImage from '../RemoteImage';
import EntityAvatar from '../EntityAvatar';
import { APP_TIME_ZONE, getPslLogo, toKarachiISODate } from '../../utils/helpers';
import { isSportRadarId, str } from '../../utils/extract';
import type { SportEventRecord } from '../../types/index';
import type { PageMeta } from '../../services/api/client';
import { MatchCardGridSkeleton } from '../skeletons/Skeletons';

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
  const [tournamentFilter, setTournamentFilter] = useState('all');

  useEffect(() => {
    setTournamentFilter('all');
  }, [date, tab]);

  const tournamentTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of events) {
      const name = tournamentNameFromRecord(record);
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [
      { key: 'all', label: 'All', count: events.length },
      ...[...counts.entries()].map(([name, count]) => ({ key: name, label: name, count })),
    ];
  }, [events]);

  const visibleEvents =
    tournamentFilter === 'all'
      ? events
      : events.filter((record) => tournamentNameFromRecord(record) === tournamentFilter);

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
              className="icon-btn h-8 w-8 rounded bg-secondary text-stext hover:text-accent"
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
              className="icon-btn h-8 w-8 rounded bg-secondary text-stext hover:text-accent"
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => jumpDay(-1)}
              className="rounded border border-lborder bg-card px-2.5 py-1 text-xs font-medium text-stext transition-colors hover:bg-[var(--color-row-hover)] hover:text-mtext"
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
              className="rounded border border-lborder bg-card px-2.5 py-1 text-xs font-medium text-stext transition-colors hover:bg-[var(--color-row-hover)] hover:text-mtext"
            >
              Tomorrow
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <PageToolbar
          end={
            <p className="text-xs text-stext">
              <span className="font-semibold text-mtext">{visibleEvents.length}</span> matches
            </p>
          }
        >
          <Tabs tabs={tabs} active={tab} onChange={onTabChange} />
        </PageToolbar>
        {tournamentTabs.length > 2 ? (
          <Tabs
            tabs={tournamentTabs}
            active={tournamentTabs.some((item) => item.key === tournamentFilter) ? tournamentFilter : 'all'}
            onChange={setTournamentFilter}
            variant="tags"
            size="sm"
          />
        ) : null}
      </div>

      {loading ? (
        <MatchCardGridSkeleton />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : visibleEvents.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleEvents.map((record, index) => (
              <div key={record.eventId} className="contents">
                <ScheduleCard record={record} />
                {visibleEvents.length >= 4 && index === 3 ? (
                  <DummyAd size="large-rectangle" placement="schedule-infeed" inFeed />
                ) : null}
              </div>
            ))}
          </div>
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

const FORMAT_LABELS: Record<string, string> = {
  t10: 'T10',
  t20: 'T20',
  t20i: 'T20I',
  odi: 'ODI',
  list_a: 'List A',
  test: 'Test',
  first_class: 'First Class',
};

function payloadEvent(record: SportEventRecord): {
  ev: Record<string, unknown>;
  st: Record<string, unknown>;
} {
  const p = record.payload || {};
  return {
    ev: (p.sport_event || p) as Record<string, unknown>,
    st: (p.sport_event_status || {}) as Record<string, unknown>,
  };
}

function competitorLabel(side: Record<string, unknown> | undefined, fallback: string): string {
  if (!side) return fallback;
  const name = str(side.name);
  if (name) return name;
  const abbr = str(side.abbreviation);
  if (abbr) return abbr;
  return fallback;
}

function competitorCode(side: Record<string, unknown> | undefined): string {
  const abbr = str(side?.abbreviation);
  return abbr && !isSportRadarId(abbr) ? abbr : '';
}

function tournamentNameFromEvent(ev: Record<string, unknown>): string {
  const context = (ev.sport_event_context || {}) as Record<string, unknown>;
  return (
    str(ev.tournament) ||
    str(context.competition) ||
    str(ev.season) ||
    str(context.season) ||
    'Match'
  );
}

function formatLabel(tournament: Record<string, unknown> | undefined): string {
  const raw = String(tournament?.format || tournament?.type || '').trim().toLowerCase();
  if (!raw || isSportRadarId(raw)) return '';
  return FORMAT_LABELS[raw] || raw.replace(/_/g, ' ').toUpperCase();
}

function roundLabel(round: Record<string, unknown>, fallback?: unknown): string {
  const named = str(round.name) || str(fallback);
  if (named) {
    return named.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const type = str(round.type);
  if (type && type !== 'group') {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const n = Number(round.number);
  if (!Number.isNaN(n) && n > 0) return `Round ${n}`;
  return '';
}

function tournamentNameFromRecord(record: SportEventRecord): string {
  const { ev } = payloadEvent(record);
  return tournamentNameFromEvent(ev);
}

function venueLabel(ev: Record<string, unknown>): string {
  const venue = (ev.venue || {}) as Record<string, unknown>;
  return (
    str(ev.venue) ||
    [str(venue.city_name) || str(venue.city), str(venue.country_name) || str(venue.country)]
      .filter(Boolean)
      .join(', ')
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

  return (
    <div className="flex items-center gap-2.5">
      {pslLogo ? (
        <RemoteImage
          src={pslLogo}
          alt={name}
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-full border border-lborder bg-white object-contain p-0.5"
        />
      ) : (
        <EntityAvatar className="h-7 w-7 text-[10px]" title={name}>
          {label}
        </EntityAvatar>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-mtext" title={name}>
        {name}
      </p>
      {score !== null && score !== undefined && score !== '' && (
        <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-mtext">{score}</p>
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
  const { ev, st } = payloadEvent(record);
  const comps = (ev.competitors || []) as Array<Record<string, unknown>>;
  const home = comps.find((c) => c.qualifier === 'home') || comps[0];
  const away = comps.find((c) => c.qualifier === 'away') || comps[1];
  const tournament = ev.tournament as Record<string, unknown> | undefined;
  const coverage = (ev.coverage || {}) as Record<string, unknown>;
  const scores = (st.period_scores || []) as Array<Record<string, unknown>>;

  const homeName = competitorLabel(home, 'TBD');
  const awayName = competitorLabel(away, 'TBD');
  const homeAbbr = competitorCode(home);
  const awayAbbr = competitorCode(away);
  const tournamentName = tournamentNameFromEvent(ev);
  const format = formatLabel(tournament);
  const round = roundLabel((ev.tournament_round || {}) as Record<string, unknown>, ev.round);
  const isLive = Boolean(coverage.live) || record.status === 'live';
  const displayScore = str(st.display_score);
  const matchStatus = str(st.match_status) || str(record.status);
  const result = str(st.match_result_text) || str(st.result);
  const location = venueLabel(ev);
  const { date: eventDate, time } = formatScheduled(record.scheduled || str(ev.scheduled));
  const homeScore = sideTotal(scores, 'home');
  const awayScore = sideTotal(scores, 'away');
  const outcome = result || displayScore;
  const href = record.eventId ? `/matches/${record.eventId}` : undefined;

  const body = (
    <>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-stext" title={tournamentName}>
          {tournamentName}
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

      {outcome ? (
        <p className="mt-2.5 truncate text-xs font-medium text-mtext">{outcome}</p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-lborder pt-2 text-xs">
        <span className="flex min-w-0 items-center gap-3">
          {eventDate && (
            <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-accent">
              <Calendar size={12} />
              {eventDate}
            </span>
          )}
          {time && (
            <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-mtext">
              <Clock size={12} />
              {time}
            </span>
          )}
          {format && <span className="truncate font-medium text-stext">{format}</span>}
          {round && <span className="truncate font-medium text-stext">{round}</span>}
        </span>

        {location && (
          <span className="inline-flex max-w-[45%] items-center gap-1 truncate font-medium text-stext" title={location}>
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{location}</span>
          </span>
        )}
      </div>
    </>
  );

  const className =
    'flex h-full flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]';

  if (!href) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link href={href} prefetch={false} className={className}>
      {body}
    </Link>
  );
}
