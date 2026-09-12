'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Shield, Swords, User } from 'lucide-react';
import PlayerCard from '../PlayerCard';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import TeamHeadToHead from './TeamHeadToHead';
import TeamLogo from '../TeamLogo';
import RemoteImage from '../RemoteImage';
import FavoriteButton from '../FavoriteButton';
import ShareButton from '../ShareButton';
import { StatusBadge } from '../Badge';
import { fetchTeamRosterPage } from '../../services/teams';
import type { NewsArticle, Player, SportEventRecord } from '../../types/index';
import { formatScheduled } from '../../utils/helpers';

const teamTabs = [
  { key: 'overview', label: 'Overview', icon: Shield },
  { key: 'fixtures', label: 'Fixtures', icon: CalendarDays },
  { key: 'results', label: 'Results', icon: CalendarDays },
  { key: 'squad', label: 'Squad', icon: User },
  { key: 'h2h', label: 'Head to Head', icon: Swords },
];

interface Props {
  team: any;
  players: Player[];
  playerTotal?: number;
  schedule: SportEventRecord[];
  results: SportEventRecord[];
  allTeams?: any[];
  relatedNews?: NewsArticle[];
}

export default function TeamDetailBody({
  team,
  players: initialPlayers,
  playerTotal = 0,
  schedule = [],
  results = [],
  allTeams = [],
  relatedNews = [],
}: Props) {
  const [tab, setTab] = useState('overview');
  const [players, setPlayers] = useState<Player[]>(initialPlayers || []);
  const [squadPage, setSquadPage] = useState(1);
  const [squadLoading, setSquadLoading] = useState(false);
  const squadTotal = playerTotal || players.length;
  const squadPages = Math.max(1, Math.ceil(squadTotal / 40));

  if (!team) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Team not found" message="We couldn't find that team. It may have been removed." />
      </div>
    );
  }

  const code = team.abbr || '';
  const teamKey = team.id || code;

  const loadMoreSquad = () => {
    const next = squadPage + 1;
    if (next > squadPages || squadLoading) return;
    setSquadLoading(true);
    fetchTeamRosterPage(teamKey, { page: next, limit: 40 })
      .then((res) => {
        setPlayers((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.items.filter((p) => !seen.has(p.id))];
        });
        setSquadPage(next);
      })
      .finally(() => setSquadLoading(false));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/teams" className="hover:text-accent">Teams</Link>
        <span>/</span>
        <span className="text-mtext">{team.name}</span>
      </nav>

      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-lborder pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-accent">
              {team.country || 'Cricket Team'}
            </span>
            {code && (
              <span className="rounded border border-lborder bg-secondary px-2.5 py-1 font-mono text-xs font-medium uppercase tracking-wider text-stext">
                {code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton targetType="team" targetId={team.id || code} compact />
            <ShareButton
              type="team"
              id={team.id || code}
              fallbackTitle={team.name}
              compact
            />
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="shrink-0">
              {team.logoUrl ? (
                <RemoteImage
                  src={team.logoUrl}
                  alt={team.name}
                  width={80}
                  height={80}
                  className="h-20 w-20 shrink-0 rounded-full border border-lborder bg-white object-contain p-1.5"
                />
              ) : (
                <TeamLogo teamId={team.teamId} name={team.name} code={code} size="xl" link={false} />
              )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-mtext">{team.name}</h1>
            {code && (
              <p className="mt-1 font-mono text-xs font-medium uppercase tracking-wider text-accent">
                {code} · Team profile
              </p>
            )}
            {team.country && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-stext">
                <MapPin size={14} className="text-accent" /> {team.country}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="min-w-24 rounded-md border border-lborder bg-secondary px-3.5 py-3 text-center">
              <p className="font-mono text-lg font-semibold text-accent">{squadTotal}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-stext">Players</p>
            </div>
            <div className="min-w-24 rounded-md border border-lborder bg-secondary px-3.5 py-3 text-center">
              <p className="font-mono text-lg font-semibold text-mtext">{schedule.length + results.length}</p>
              <p className="text-xs font-medium uppercase tracking-wider text-stext">Events</p>
            </div>
          </div>
        </div>
      </header>

      <Tabs tabs={teamTabs} active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="fade-in space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoStat label="Team ID" value={team.id} />
            <InfoStat label="Abbreviation" value={code || '—'} />
            <InfoStat label="Country" value={team.country || '—'} />
          </div>
          <p className="rounded-md border border-lborder bg-card p-4 text-sm leading-relaxed text-stext">
            Upcoming fixtures and recent results come from the team schedule and results feeds. Open those tabs for the full list.
          </p>
        </div>
      )}

      {tab === 'fixtures' && (
        <div className="fade-in">
          {schedule.length > 0 ? (
            <div className="space-y-2">
              {schedule.map((event) => (
                <SportEventRow key={event.eventId || event.scopeKey} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming fixtures" message="This team has no scheduled matches in the current feed." />
          )}
        </div>
      )}

      {tab === 'results' && (
        <div className="fade-in">
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((event) => (
                <SportEventRow key={event.eventId || event.scopeKey} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState title="No results" message="Recent results are not available for this team yet." />
          )}
        </div>
      )}

      {tab === 'squad' && (
        <div className="fade-in space-y-4">
          {players && players.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {players.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
              {squadPage < squadPages && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={loadMoreSquad}
                    disabled={squadLoading}
                    className="rounded-md border border-lborder bg-card px-4 py-2 text-xs font-semibold text-mtext hover:border-accent/40 disabled:opacity-60"
                  >
                    {squadLoading ? 'Loading…' : `Load more (${players.length} of ${squadTotal})`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState title="No players" message="Squad information is not available yet." />
          )}
        </div>
      )}

      {tab === 'h2h' && (
        <div className="fade-in">
          <TeamHeadToHead team={team} allTeams={allTeams} teamMatches={[]} />
        </div>
      )}

      {relatedNews.length > 0 && (
        <section className="rounded-md border border-lborder bg-card p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stext">Related news</h3>
          <ul className="space-y-2">
            {relatedNews.map((article) => (
              <li key={article.id}>
                <Link href={`/news/${article.slug || article.id}`} className="text-sm font-semibold text-mtext hover:text-accent">
                  {article.title}
                </Link>
                <p className="text-xs text-stext">{article.date}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function eventTitle(event: SportEventRecord): string {
  const payload = event.payload || {};
  const names = payload.teamNames;
  if (Array.isArray(names) && names.length >= 2) return `${names[0]} vs ${names[1]}`;
  if (typeof payload.title === 'string' && payload.title) return payload.title;
  if (typeof payload.tournament === 'string' && payload.tournament) return payload.tournament;
  return event.eventId || 'Match';
}

function SportEventRow({ event }: { event: SportEventRecord }) {
  const payload = event.payload || {};
  const { date, time } = formatScheduled(event.scheduled || (payload.scheduled as string) || '');
  const score = (payload.displayScore as string) || (payload.result as string) || '';
  const href = event.eventId ? `/matches/${event.eventId}` : undefined;

  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/40 hover:bg-elevated">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-mtext">{eventTitle(event)}</p>
        <p className="mt-0.5 text-xs text-stext">
          {[date, time, payload.venue].filter(Boolean).join(' · ') || 'Schedule TBA'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {score ? <span className="font-mono text-xs font-bold text-accent">{score}</span> : null}
        <StatusBadge status={event.status || (payload.status as string) || ''} />
      </div>
    </div>
  );

  if (!href) return inner;
  return <Link href={href} prefetch={false}>{inner}</Link>;
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-lborder bg-card p-3.5">
      <p className="text-xs font-medium uppercase tracking-wider text-stext">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-mtext" title={value}>{value}</p>
    </div>
  );
}
