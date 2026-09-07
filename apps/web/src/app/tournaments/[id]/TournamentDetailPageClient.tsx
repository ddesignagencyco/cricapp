'use client';

import Link from 'next/link';
import { Calendar, CalendarDays, MapPin, Swords, Trophy } from 'lucide-react';
import EmptyState from '../../../components/EmptyState';
import Badge from '../../../components/Badge';

function getCategoryName(cat: any): string {
  if (!cat) return '';
  if (typeof cat === 'string') return cat;
  return cat.name || cat.country || '';
}

function getSeasonName(cs: any): string {
  if (!cs) return '';
  if (typeof cs === 'string') return cs;
  return cs.name || cs.year || '';
}

function getStatusText(status: string | undefined): string {
  if (!status) return '';
  const s = String(status);
  if (s === 'closed' || s === 'ended') return 'Completed';
  if (s === 'live' || s === 'inprogress') return 'Live';
  if (s === 'cancelled') return 'Cancelled';
  return 'Scheduled';
}

function formatScheduled(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
    homeAbbr: home.abbreviation || home.id?.slice(-3) || '??',
    awayAbbr: away.abbreviation || away.id?.slice(-3) || '??',
  };
}

function getEventStatus(record: any): { status: string; result?: string; score?: string } {
  const payload = record?.payload || {};
  const statusBlock = payload.sport_event_status || {};
  return {
    status: statusBlock.status || record.status || '',
    result: statusBlock.match_result_text || statusBlock.result || '',
    score: statusBlock.display_score || '',
  };
}

interface TournamentDetailPageClientProps {
  tournament: any;
  seasons: any[];
  results: any[];
}

export default function TournamentDetailPageClient({ tournament, seasons, results }: TournamentDetailPageClientProps) {
  const category = getCategoryName(tournament.category) || 'International';
  const season = getSeasonName(tournament.currentSeason);
  const typeRaw: any = tournament.type;
  const format = typeof typeRaw === 'string' ? typeRaw.toUpperCase() : typeRaw?.name || '';

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/tournaments" className="hover:text-accent">Tournaments</Link>
        <span>/</span>
        <span className="text-mtext">{tournament.name}</span>
      </nav>

      <header className="rounded-3xl bg-card p-6 ring-1 ring-lborder sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-accent">
                <Trophy size={16} />
                <span className="text-xs font-bold uppercase tracking-widest text-stext">Tournament</span>
              </div>
              {format && <Badge tone="qualified">{format}</Badge>}
              {tournament.gender && (
                <Badge tone="neutral" className="capitalize">{tournament.gender}</Badge>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{tournament.name}</h1>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-lborder pt-4 text-xs text-stext">
          {category && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} /> {category}
            </span>
          )}
          {season && (
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} /> {season}
            </span>
          )}
          {tournament.countryCode && (
            <span className="flex items-center gap-1.5">
              {tournament.countryCode}
            </span>
          )}
        </div>
      </header>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-accent" />
          <h2 className="text-lg font-bold text-mtext">Seasons</h2>
        </div>
        {seasons && seasons.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {seasons.map((s) => (
              <div key={s.id} className="rounded-xl bg-card p-4 ring-1 ring-lborder">
                <p className="text-sm font-bold text-mtext">{s.name || s.year || s.id}</p>
                {s.year && <p className="mt-0.5 text-xs text-stext">{s.year}</p>}
                {(s.startDate || s.endDate) && (
                  <p className="mt-2 text-[11px] text-stext">
                    {formatScheduled(s.startDate)}
                    {s.startDate && s.endDate ? ' — ' : s.endDate ? '' : ''}
                    {formatScheduled(s.endDate)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No seasons available" message="Season information is not available for this tournament yet." />
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Swords size={16} className="text-accent2" />
          <h2 className="text-lg font-bold text-mtext">Results</h2>
          <span className="text-xs text-stext">({results?.length || 0})</span>
        </div>
        {results && results.length > 0 ? (
          <div className="space-y-3">
            {results.map((record) => {
              const { homeName, awayName, homeAbbr, awayAbbr } = getEventTeams(record);
              const es = getEventStatus(record);
              const statusText = getStatusText(es.status);
              return (
                <Link
                  key={record.eventId}
                  href={`/matches/${record.eventId}`}
                  className="block rounded-xl bg-card p-4 ring-1 ring-lborder transition-all duration-200 hover:bg-elevated"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-mtext">{homeName}</p>
                        <p className="text-[11px] text-stext">{homeAbbr}</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-stext">v</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-right text-sm font-semibold text-mtext">{awayName}</p>
                        <p className="text-right text-[11px] text-stext">{awayAbbr}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge tone={es.status === 'closed' || es.status === 'ended' ? 'completed' : es.status === 'cancelled' ? 'error' : 'upcoming'}>
                        {statusText}
                      </Badge>
                      {es.result && <p className="mt-1 text-[11px] font-medium text-gold">{es.result}</p>}
                      {es.score && <p className="mt-0.5 font-mono text-[11px] text-stext">{es.score}</p>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No results available" message="Match results for this tournament are not available yet." />
        )}
      </section>
    </div>
  );
}
