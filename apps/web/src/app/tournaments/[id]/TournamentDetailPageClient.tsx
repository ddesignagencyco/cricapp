'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, CalendarDays, MapPin, Trophy } from 'lucide-react';
import EmptyState from '../../../components/EmptyState';
import DummyAd from '../../../components/advertisements/DummyAd';
import { StatusBadge } from '../../../components/Badge';
import { APP_TIME_ZONE } from '../../../utils/helpers';
import type { SportEventRecord, TournamentSeason } from '../../../types/index';

function getCategoryName(cat: unknown): string {
  if (!cat) return '';
  if (typeof cat === 'string') return cat;
  const o = cat as Record<string, unknown>;
  return String(o.name || o.country || '');
}

function getSeasonName(cs: unknown): string {
  if (!cs) return '';
  if (typeof cs === 'string') return cs;
  const o = cs as Record<string, unknown>;
  return String(o.name || o.year || '');
}

function formatScheduled(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  });
}

function getEventTeams(record: Record<string, unknown>): {
  homeName: string;
  awayName: string;
} {
  const payload = (record.payload || {}) as Record<string, unknown>;
  const event = (payload.sport_event || payload) as Record<string, unknown>;
  const comps = (event.competitors || []) as Array<Record<string, unknown>>;
  const home = comps.find((c) => c.qualifier === 'home') || comps[0] || {};
  const away = comps.find((c) => c.qualifier === 'away') || comps[1] || {};
  return {
    homeName: String(home.name || 'TBD'),
    awayName: String(away.name || 'TBD'),
  };
}

function getEventStatus(record: Record<string, unknown>): {
  status: string;
  result?: string;
  score?: string;
} {
  const payload = (record.payload || {}) as Record<string, unknown>;
  const statusBlock = (payload.sport_event_status || {}) as Record<string, unknown>;
  return {
    status: String(statusBlock.status || record.status || ''),
    result: String(statusBlock.match_result_text || statusBlock.result || ''),
    score: String(statusBlock.display_score || ''),
  };
}

function TournamentResultCard({ record }: { record: Record<string, unknown> & { eventId?: string; scheduled?: string } }) {
  const { homeName, awayName } = getEventTeams(record);
  const es = getEventStatus(record);
  return (
    <Link
      href={`/matches/${record.eventId}`}
      className="flex flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-stext">
          {formatScheduled(record.scheduled) || 'Match'}
        </p>
        <StatusBadge status={es.status} />
      </div>
      <p className="truncate text-sm font-semibold text-mtext">{homeName}</p>
      <p className="mt-1 truncate text-sm font-semibold text-mtext">{awayName}</p>
      {(es.result || es.score) && (
        <p className="mt-2 truncate text-xs font-medium text-mtext">{es.result || es.score}</p>
      )}
    </Link>
  );
}

function seasonLabel(season: TournamentSeason): string {
  return season.name || season.year || season.id;
}

interface TournamentDetailPageClientProps {
  tournament: Record<string, unknown> & {
    name?: string;
    type?: string | { name?: string };
    gender?: string;
    category?: unknown;
    currentSeason?: unknown;
    countryCode?: string;
  };
  seasons: TournamentSeason[];
  resultsBySeason: Record<string, SportEventRecord[]>;
  initialSeasonId: string;
}

export default function TournamentDetailPageClient({
  tournament,
  seasons,
  resultsBySeason,
  initialSeasonId,
}: TournamentDetailPageClientProps) {
  const [seasonId, setSeasonId] = useState(initialSeasonId || seasons[0]?.id || '');
  const category = getCategoryName(tournament.category) || 'International';
  const season = getSeasonName(tournament.currentSeason);
  const typeRaw = tournament.type;
  const format =
    typeof typeRaw === 'string'
      ? typeRaw.replace(/_/g, ' ')
      : typeRaw?.name || '';
  const selectedSeason = seasons.find((item) => item.id === seasonId) || seasons[0];
  const results = useMemo(
    () => (seasonId && resultsBySeason[seasonId]) || [],
    [resultsBySeason, seasonId],
  );
  const totalResults = useMemo(
    () => Object.values(resultsBySeason).reduce((sum, items) => sum + (items?.length || 0), 0),
    [resultsBySeason],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/tournaments" className="hover:text-accent">
          Tournaments
        </Link>
        <span>/</span>
        <span className="text-mtext">{tournament.name}</span>
      </nav>

      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium tracking-wider text-accent">
            Tournament
          </span>
          {format && (
            <span className="rounded border border-lborder bg-secondary px-2.5 py-1 text-xs font-medium tracking-wider text-stext">
              {format}
            </span>
          )}
          {tournament.gender && (
            <span className="rounded border border-lborder bg-secondary px-2.5 py-1 text-xs font-medium capitalize text-stext">
              {tournament.gender}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md border border-lborder bg-secondary text-accent">
            <Trophy size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-mtext">{tournament.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stext">
              {category && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {category}
                </span>
              )}
              {season && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={12} /> {season}
                </span>
              )}
              {tournament.countryCode && <span>{tournament.countryCode}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="min-w-24 rounded-md border border-lborder bg-secondary px-3.5 py-3 text-center">
              <p className="font-mono text-lg font-semibold text-accent">{seasons?.length || 0}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-stext">Seasons</p>
            </div>
            <div className="min-w-24 rounded-md border border-lborder bg-secondary px-3.5 py-3 text-center">
              <p className="font-mono text-lg font-semibold text-mtext">{totalResults}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-stext">Results</p>
            </div>
          </div>
        </div>
      </header>

      <DummyAd size="leaderboard" placement="tournament-detail-after-intro" />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-mtext">Seasons</h2>
        {seasons && seasons.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seasons.map((item) => {
              const active = item.id === selectedSeason?.id;
              const count = resultsBySeason[item.id]?.length || 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSeasonId(item.id)}
                  aria-pressed={active}
                  className={`rounded-md border p-3.5 text-left transition-colors ${
                    active
                      ? 'border-accent/50 bg-accent/10'
                      : 'border-lborder bg-card hover:border-accent/40 hover:bg-elevated'
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-mtext">{seasonLabel(item)}</p>
                  {(item.startDate || item.endDate) && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-stext">
                      <Calendar size={11} />
                      {formatScheduled(item.startDate)}
                      {item.startDate && item.endDate ? ' — ' : ''}
                      {formatScheduled(item.endDate)}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs font-medium text-stext">
                    {count} {count === 1 ? 'result' : 'results'}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No seasons available"
            message="Season information is not available for this tournament yet."
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold text-mtext">
            Results
            <span className="ml-2 text-sm font-normal text-stext">
              {selectedSeason ? seasonLabel(selectedSeason) : ''}
              {selectedSeason ? ` (${results.length})` : ''}
            </span>
          </h2>
          {seasons.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              {seasons.map((item) => {
                const active = item.id === selectedSeason?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSeasonId(item.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? 'btn-brand pointer-events-none'
                        : 'bg-card text-stext ring-1 ring-lborder hover:bg-elevated hover:text-mtext'
                    }`}
                  >
                    {item.year || seasonLabel(item)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {results && results.length > 0 ? (
          results.length >= 6 ? (
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
                {results.map((record) => (
                  <TournamentResultCard key={record.eventId} record={record} />
                ))}
              </div>
              <div className="flex justify-center lg:justify-start">
                <DummyAd size="medium-rectangle" placement="tournament-detail-sidebar" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {results.map((record) => (
                <TournamentResultCard key={record.eventId} record={record} />
              ))}
            </div>
          )
        ) : (
          <EmptyState
            title="No results available"
            message={
              selectedSeason
                ? `Match results for ${seasonLabel(selectedSeason)} are not available yet.`
                : 'Match results for this tournament are not available yet.'
            }
          />
        )}
      </section>
    </div>
  );
}
