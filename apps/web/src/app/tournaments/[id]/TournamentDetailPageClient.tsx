'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Calendar, CalendarDays, Info, MapPin, Newspaper, Users } from 'lucide-react';
import EmptyState from '../../../components/EmptyState';
import DummyAd from '../../../components/advertisements/DummyAd';
import { StatusBadge } from '../../../components/Badge';
import FavoriteButton from '../../../components/FavoriteButton';
import ShareButton from '../../../components/ShareButton';
import Tabs from '../../../components/Tabs';
import { RelatedNewsPanel, useLinkedNews } from '../../../components/boards/RelatedNewsPanel';
import EntityAvatar from '../../../components/EntityAvatar';
import { APP_TIME_ZONE, getInitials } from '../../../utils/helpers';
import type { TournamentInfo } from '../../../services/tournaments';
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
      className="flex flex-col detail-panel detail-panel--hover p-3.5"
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
    id?: string;
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
  info?: TournamentInfo | null;
}

/** `GET /tournaments/:id` also ships `groups`; the info endpoint is the fresher source. */
function normalizeTeams(value: unknown): { name: string; abbr: string; country: string }[] {
  if (!Array.isArray(value)) return [];
  const out: { name: string; abbr: string; country: string }[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const name = String(row.name || row.teamName || '').trim();
    if (!name) continue;
    out.push({
      name,
      abbr: String(row.abbreviation || row.abbr || '').trim(),
      country: String(row.country_name || row.country || row.country_code || '').trim(),
    });
  }
  return out;
}

/** Prefers info.groups, falls back to tournament.groups when info has none. */
function resolveGroups(
  info: TournamentInfo | null | undefined,
  tournament: Record<string, unknown>
): { name: string; teams: { name: string; abbr: string; country: string }[] }[] {
  const fromInfo = (info?.groups || [])
    .map((group) => ({ name: group.name || 'Group', teams: normalizeTeams(group.teams) }))
    .filter((group) => group.teams.length > 0);
  if (fromInfo.length > 0) return fromInfo;

  const raw = tournament.groups;
  if (Array.isArray(raw)) {
    return raw
      .map((group) => {
        const row = (group || {}) as Record<string, unknown>;
        return { name: String(row.name || 'Group'), teams: normalizeTeams(row.teams) };
      })
      .filter((group) => group.teams.length > 0);
  }
  // Some payloads expose a flat team list with no grouping.
  const flat = normalizeTeams(raw);
  return flat.length > 0 ? [{ name: 'Teams', teams: flat }] : [];
}

/** Every field the API sends, ids included, so nothing in the payload is hidden. */
function label(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function InfoRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-lborder py-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-stext sm:w-48">{term}</dt>
      <dd className="min-w-0 break-words font-mono text-xs text-mtext">{children}</dd>
    </div>
  );
}

function TournamentInfoPanel({
  info,
  fallbackTournament,
}: {
  info?: TournamentInfo | null;
  fallbackTournament: Record<string, unknown>;
}) {
  // The info payload is the snapshot; fall back to the tournament record itself.
  const t = info?.tournament || null;
  const category = t?.category;
  const season = t?.current_season;
  const sport = t?.sport;

  const rows: Array<[string, unknown]> = [
    ['Tournament id', t?.id ?? fallbackTournament.id],
    ['Name', t?.name ?? fallbackTournament.name],
    ['Type', t?.type],
    ['Gender', t?.gender],
    ['Category', category],
    ['Category id', typeof category === 'object' && category ? (category as { id?: string }).id : undefined],
    ['Category code', typeof category === 'object' && category ? (category as { country_code?: string }).country_code : undefined],
    ['Sport', sport],
    ['Sport id', typeof sport === 'object' && sport ? (sport as { id?: string }).id : undefined],
    ['Tour id', t?.tour_id],
    ['Parent id', t?.parent_id],
    ['Current season id', season?.id],
    ['Current season', season ? season.name || season.year : undefined],
    ['Season start', season ? (season as { start_date?: string }).start_date : undefined],
    ['Season end', season ? (season as { end_date?: string }).end_date : undefined],
    ['Season coverage', t?.season_coverage_info],
    ['Generated at', info?.generated_at],
  ];

  return (
    <div className="space-y-5">
      {info?.generated_at ? (
        <p className="text-xs text-stext">
          This is the stored data snapshot. It refreshes when the feed is re-synced, so it can lag
          behind live data.
        </p>
      ) : (
        <p className="text-xs text-stext">
          No stored snapshot yet — showing what the tournament record itself carries.
        </p>
      )}

      <section className="detail-panel p-4 sm:p-5">
        <h2 className="mb-2 text-lg font-semibold text-mtext">Tournament details</h2>
        <dl>
          {rows.map(([term, value]) => (
            <InfoRow key={term} term={term}>
              {label(value)}
            </InfoRow>
          ))}
        </dl>
      </section>

      {info?.groups && info.groups.length > 0 ? (
        <section className="detail-panel p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold text-mtext">Groups</h2>
          <div className="space-y-4">
            {info.groups.map((group, index) => (
              <div key={group.name || index}>
                <p className="text-sm font-semibold text-mtext">{group.name || `Group ${index + 1}`}</p>
                {group.teams.length === 0 ? (
                  <p className="mt-1 text-xs text-stext">No teams in this group.</p>
                ) : (
                  <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {group.teams.map((team) => (
                      <li
                        key={team.id || team.name}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-md bg-secondary px-2.5 py-1.5 ring-1 ring-lborder"
                      >
                        <span className="text-xs font-semibold text-mtext">{team.name}</span>
                        {team.abbreviation ? (
                          <span className="font-mono text-[11px] uppercase text-stext">
                            {team.abbreviation}
                          </span>
                        ) : null}
                        {team.country ? <span className="text-[11px] text-stext">{team.country}</span> : null}
                        {team.country_code ? (
                          <span className="font-mono text-[11px] text-stext">{team.country_code}</span>
                        ) : null}
                        {team.gender ? <span className="text-[11px] text-stext">{team.gender}</span> : null}
                        <span className="w-full break-all font-mono text-[10px] text-stext/80">
                          {team.id}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function TournamentDetailPageClient({
  tournament,
  seasons,
  resultsBySeason,
  initialSeasonId,
  info,
}: TournamentDetailPageClientProps) {
  const [seasonId, setSeasonId] = useState(initialSeasonId || seasons[0]?.id || '');
  const [tab, setTab] = useState('results');
  const category = getCategoryName(tournament.category) || 'International';
  const season = getSeasonName(tournament.currentSeason);
  const typeRaw = tournament.type;
  const format =
    typeof typeRaw === 'string'
      ? typeRaw.replace(/_/g, ' ')
      : typeRaw?.name || '';
  const selectedSeason = seasons.find((item) => item.id === seasonId) || seasons[0];
  const tournamentId = String(tournament.id || '');
  const { articles: news, loading: newsLoading } = useLinkedNews({ seriesId: tournamentId });
  const groups = useMemo(() => resolveGroups(info, tournament), [info, tournament]);
  const teamCount = groups.reduce((sum, group) => sum + group.teams.length, 0);
  const seriesTabs = [
    { key: 'results', label: 'Results', icon: CalendarDays },
    ...(groups.length > 0 ? [{ key: 'teams', label: 'Teams', icon: Users }] : []),
    { key: 'info', label: 'Info', icon: Info },
    { key: 'news', label: 'News', icon: Newspaper },
  ];
  const results = useMemo(
    () => (seasonId && resultsBySeason[seasonId]) || [],
    [resultsBySeason, seasonId],
  );
  const totalResults = useMemo(
    () => Object.values(resultsBySeason).reduce((sum, items) => sum + (items?.length || 0), 0),
    [resultsBySeason],
  );

  return (
    <div className="detail-page mx-auto max-w-7xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link href="/tournaments" className="font-semibold text-accent transition-colors hover:text-mtext">
          Tournaments
        </Link>
        <span className="text-stext" aria-hidden="true">/</span>
        <span className="truncate font-medium text-mtext max-w-[12rem] sm:max-w-none">{tournament.name}</span>
      </nav>

      <header className="detail-hero p-4 sm:p-8">
        <div className="flex items-center justify-between gap-3 border-b border-lborder pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="detail-chip font-semibold text-accent">
              Tournament
            </span>
            {format && (
              <span className="detail-chip tracking-wider">
                {format}
              </span>
            )}
            {tournament.gender && (
              <span className="detail-chip capitalize">
                {tournament.gender}
              </span>
            )}
          </div>
          {tournamentId ? (
            <div className="flex shrink-0 items-center gap-2">
              <FavoriteButton targetType="tournament" targetId={tournamentId} compact />
              <ShareButton
                type="tournament"
                id={tournamentId}
                fallbackTitle={String(tournament.name || 'Tournament')}
                href={`/tournaments/${encodeURIComponent(tournamentId)}`}
                compact
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <EntityAvatar className="h-14 w-14 text-lg">
            {getInitials(String(tournament.name || 'Tournament'))}
          </EntityAvatar>
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
            <div className="detail-stat-box">
              <p className="font-mono text-lg font-semibold text-accent">{seasons?.length || 0}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-stext">Seasons</p>
            </div>
            <div className="detail-stat-box">
              <p className="font-mono text-lg font-semibold text-mtext">{totalResults}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-stext">Results</p>
            </div>
            {teamCount > 0 ? (
              <div className="detail-stat-box">
                <p className="font-mono text-lg font-semibold text-mtext">{teamCount}</p>
                <p className="text-xs font-medium uppercase tracking-wider text-stext">Teams</p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <DummyAd size="leaderboard" placement="tournament-detail-after-intro" />

      <div className="detail-tabs-sticky">
        <Tabs tabs={seriesTabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'news' && (
        <RelatedNewsPanel
          articles={news}
          loading={newsLoading}
          emptyTitle="No series news"
          emptyHint="Publish a story from Admin → News and link this series. Drafts do not appear here."
        />
      )}

      {tab === 'teams' && (
        <div className="space-y-5">
          {info?.generated_at ? (
            <p className="text-xs text-stext">
              Team list last refreshed {info.generated_at.slice(0, 10)}.
            </p>
          ) : null}
          {groups.map((group) => (
            <section key={group.name}>
              <h2 className="mb-3 text-lg font-semibold text-mtext">
                {group.name}
                <span className="ml-2 text-sm font-normal text-stext">{group.teams.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.teams.map((team) => (
                  <div
                    key={`${group.name}-${team.name}`}
                    className="card-interactive flex items-center gap-3 rounded-md p-3.5"
                  >
                    <EntityAvatar className="h-11 w-11 shrink-0 text-sm">
                      {(team.abbr || team.name).slice(0, 2).toUpperCase()}
                    </EntityAvatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-mtext">{team.name}</p>
                        {team.abbr ? (
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-stext">
                            {team.abbr}
                          </span>
                        ) : null}
                      </div>
                      {team.country ? (
                        <p className="mt-0.5 truncate text-xs text-stext">{team.country}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {groups.length === 0 ? (
            <EmptyState
              title="No team list yet"
              message="The team list for this tournament is not stored yet. It appears here after the next data refresh."
            />
          ) : null}
        </div>
      )}

      {tab === 'info' && (
        <TournamentInfoPanel info={info} fallbackTournament={tournament} />
      )}

      {tab === 'results' && (
      <div className="space-y-5">
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
                  className={`detail-panel detail-panel--hover p-3.5 text-left ${active ? 'detail-panel--active' : ''}`}
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
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors duration-[180ms] motion-reduce:transition-none ${
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
      )}
    </div>
  );
}
