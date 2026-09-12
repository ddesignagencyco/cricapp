'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Calendar, Clock, MapPin, Radio, Trophy, Users } from 'lucide-react';
import LiveIndicator from '../LiveIndicator';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import HeadToHeadWidget from '../HeadToHeadWidget';
import TeamLogo from '../TeamLogo';
import FavoriteButton from '../FavoriteButton';
import ShareButton from '../ShareButton';
import CommentsSection from '../CommentsSection';
import BallTracker from '../BallTracker';
import MatchTimeline, { extractBalls } from '../MatchTimeline';
import { formatScheduled } from '../../utils/helpers';
import { fetchMatchTimeline, matchSideIds } from '../../services/matches';
import { fetchHeadToHead } from '../../services/headToHead';
import { fetchNews } from '../../services/news';
import { fetchTeams } from '../../services/teams';
import { getInitials } from '../../utils/helpers';
import { useMatchStream } from '../../hooks/useMatchStream';
import type { NewsArticle, Team } from '../../types';

const detailTabs = [
  { key: 'live', label: 'Live Score', icon: Users },
  { key: 'timeline', label: 'Timeline', icon: Radio },
  { key: 'info', label: 'Match Info', icon: MapPin },
];

const completedTabs = [
  { key: 'info', label: 'Match Info', icon: MapPin },
  { key: 'timeline', label: 'Timeline', icon: Radio },
  { key: 'result', label: 'Result', icon: Trophy },
];

interface Props {
  match: any;
  headToHead?: any;
}

function looksLikeTeamId(value: string): boolean {
  return value.startsWith('sr:competitor:') || /^[0-9a-f-]{20,}$/i.test(value);
}

function resolveTeamId(raw: string, teams: Team[]): string {
  if (!raw) return '';
  if (raw.startsWith('sr:competitor:')) return raw;
  const needle = raw.toLowerCase();
  const t = teams.find(
    (x) =>
      (x.abbr || '').toLowerCase() === needle ||
      (x.code || '').toLowerCase() === needle ||
      (x.id || '').toLowerCase() === needle ||
      (x.name || '').toLowerCase() === needle
  );
  if (t?.id) return t.id;
  return looksLikeTeamId(raw) ? raw : '';
}

function displaySide(match: any, index: 0 | 1) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const side = isObj ? (index === 0 ? teams.home : teams.away) : null;
  const rawCode = side?.code || side?.abbr || (Array.isArray(teams) ? teams[index] : '') || '';
  const rawName = side?.name || match.teamNames?.[index] || '';
  const name = String(rawName || '').replace(/^sr:competitor:/, '') || (index === 0 ? 'Team A' : 'Team B');
  const codeStr = String(rawCode || '').replace(/^sr:competitor:/, '');
  const badCode = !codeStr || /^sr:/.test(codeStr) || codeStr.length > 5;
  return {
    name,
    code: badCode ? getInitials(name) : codeStr.toUpperCase(),
    raw: String(rawCode || rawName || ''),
  };
}

export default function MatchDetailBody({ match: initialMatch, headToHead: initialHeadToHead }: Props) {
  const [match, setMatch] = useState(initialMatch);
  const [tab, setTab] = useState(
    initialMatch?.status === 'completed' || initialMatch?.status === 'cancelled' ? 'info' : 'live'
  );
  const [timeline, setTimeline] = useState<Record<string, unknown> | null>(null);
  const [headToHead, setHeadToHead] = useState(initialHeadToHead || null);
  const [relatedNews, setRelatedNews] = useState<NewsArticle[]>([]);
  const matchId = initialMatch?.matchId || initialMatch?.id;
  const liveUpdate = useMatchStream(matchId, initialMatch?.status === 'live');

  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  useEffect(() => {
    if (!liveUpdate || liveUpdate.type === 'ping') return;
    const payload =
      liveUpdate.data && typeof liveUpdate.data === 'object'
        ? (liveUpdate.data as Record<string, unknown>)
        : {};
    setMatch((prev: any) => ({ ...prev, ...payload }));
  }, [liveUpdate]);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    fetchMatchTimeline(matchId)
      .then((res) => {
        if (!cancelled) setTimeline(res?.payload || null);
      })
      .catch(() => {
        if (!cancelled) setTimeline(null);
      });
    fetchNews({ matchId, limit: 6 })
      .then((items) => {
        if (!cancelled) setRelatedNews(items);
      })
      .catch(() => {
        if (!cancelled) setRelatedNews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  useEffect(() => {
    const sides = matchSideIds(initialMatch);
    const homeRaw = sides.home || initialMatch?.teams?.home?.code || initialMatch?.home?.code || (Array.isArray(initialMatch?.teams) ? initialMatch.teams[0] : '') || '';
    const awayRaw = sides.away || initialMatch?.teams?.away?.code || initialMatch?.away?.code || (Array.isArray(initialMatch?.teams) ? initialMatch.teams[1] : '') || '';
    let cancelled = false;
    const load = async () => {
      let teamAId = homeRaw.startsWith('sr:competitor:') ? homeRaw : '';
      let teamBId = awayRaw.startsWith('sr:competitor:') ? awayRaw : '';
      if (!teamAId || !teamBId) {
        const teams = await fetchTeams({ limit: 100 }).catch(() => [] as Team[]);
        if (cancelled) return;
        teamAId = resolveTeamId(homeRaw, teams);
        teamBId = resolveTeamId(awayRaw, teams);
      }
      if (!teamAId || !teamBId) return;
      const data = await fetchHeadToHead(teamAId, teamBId);
      if (!cancelled) setHeadToHead(data);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialMatch]);

  const isLive = match?.status === 'live';
  const isUpcoming = match?.status === 'upcoming';
  const isCompleted = match?.status === 'completed';
  const isCancelled = match?.status === 'cancelled';
  const activeTabs = isCompleted || isCancelled ? completedTabs : detailTabs;

  if (!match) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Match not found" message="We couldn't find that match. It may have been moved or removed." />
      </div>
    );
  }

  const home = displaySide(match, 0);
  const away = displaySide(match, 1);
  const homeCode = home.code;
  const awayCode = away.code;
  const homeName = home.name;
  const awayName = away.name;

  const inn = match.currentInnings;
  const battingCode = inn?.battingTeam;
  const sideMatches = (side: { code: string; name: string; raw: string }, value: string) => {
    const needle = String(value || '').replace(/^sr:competitor:/, '').toLowerCase();
    return [side.code, side.name, side.raw].some((part) => String(part || '').replace(/^sr:competitor:/, '').toLowerCase() === needle);
  };
  const battingIsHome = Boolean(battingCode) && sideMatches(home, battingCode);
  const hasInnings = inn && (inn.runs > 0 || inn.wickets > 0 || inn.overs > 0);

  let homeScore = '';
  let awayScore = '';
  let homeOvers: string | number = '';
  let awayOvers: string | number = '';

  if (isUpcoming) {
    homeScore = '';
    awayScore = '';
  } else if (isLive && hasInnings) {
    if (battingIsHome) {
      homeScore = match.displayScore || '';
      homeOvers = inn.overs;
    } else {
      awayScore = match.displayScore || '';
      awayOvers = inn.overs;
    }
  } else if (isCompleted && match.displayScore) {
    if (battingIsHome) {
      homeScore = match.displayScore;
      homeOvers = inn?.overs ?? '';
    } else if (battingCode) {
      awayScore = match.displayScore;
      awayOvers = inn?.overs ?? '';
    }
  }

  const { date, time } = formatScheduled(match.scheduled);

  const breadcrumbName = (isCompleted || isCancelled)
    ? `${homeName} vs ${awayName}`
    : match.matchId?.replace(/^sr:match:/, 'Match #') || 'Match';

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/matches" className="hover:text-accent transition-colors">Matches</Link>
        <span>/</span>
        <span className="text-mtext truncate max-w-[200px] sm:max-w-none font-medium">{breadcrumbName}</span>
      </nav>

      <header className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-br from-card via-card to-elevated p-6 shadow-md transition-all sm:p-8">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
        {isLive && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500 animate-pulse" />
        )}

        {/* Top Badges & Actions */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-lborder/60 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-accent border border-accent/20">
              {match.tournament || 'Match Fixture'}
            </span>
            {match.format && (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-stext border border-lborder/60">
                {match.format}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLive ? (
              <LiveIndicator />
            ) : isUpcoming ? (
              <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">Upcoming</span>
            ) : isCancelled ? (
              <span className="rounded-full bg-stext/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-stext border border-lborder/60">Cancelled</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-500 border border-amber-500/20">
                <Trophy size={13} />
                Completed
              </span>
            )}
            <FavoriteButton targetType="match" targetId={String(match.matchId || match.id || '')} compact />
            <ShareButton
              type="match"
              id={String(match.matchId || match.id || '')}
              fallbackTitle={`${homeName} vs ${awayName}`}
              compact
            />
          </div>
        </div>

        {/* Big Stadium Scoreboard Matchup */}
        <div className="relative mt-6 flex flex-col gap-6 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-8">
          <div className="flex min-w-0 flex-1 justify-start">
            <TeamSide
              code={homeCode}
              name={homeName}
              score={homeScore}
              overs={homeOvers}
              align="left"
            />
          </div>

          <div className="flex shrink-0 flex-col items-center justify-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-lborder bg-secondary shadow-inner">
              <span className="font-mono text-xs font-black italic tracking-wider text-stext">VS</span>
            </div>
            {match.round && (
              <span className="mt-2 text-xs font-bold uppercase tracking-widest text-stext/80">
                {match.round}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 justify-end">
            <TeamSide
              code={awayCode}
              name={awayName}
              score={awayScore}
              overs={awayOvers}
              align="right"
            />
          </div>
        </div>

        {/* Live innings detail ticker */}
        {hasInnings && (
          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/80 p-3.5 border border-lborder/60 text-xs font-semibold text-stext">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-mtext">
                <BarChart3 size={15} className="text-accent" />
                <span className="font-bold text-accent">{battingCode || 'Batting'}</span> {inn.runs}/{inn.wickets}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-accent" /> {inn.overs} ov (RR {inn.runRate})
              </span>
            </div>
            {match.lastEvent?.type && match.lastEvent.type !== 'none' && (
              <span className="rounded-lg bg-card px-2.5 py-1 text-xs font-bold text-mtext border border-lborder/60">
                Last: {match.lastEvent.type} +{match.lastEvent.runs ?? 0}
              </span>
            )}
          </div>
        )}

        {/* Matchday Meta Footer */}
        {(date || time || match.venue) && (
          <div className="relative mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-lborder/60 pt-4 text-xs font-medium text-stext">
            {date && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-accent" /> {date}
              </span>
            )}
            {time && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-accent" /> {time}
              </span>
            )}
            {match.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-accent" /> {match.venue}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="mt-4">
        <Tabs tabs={activeTabs} active={tab} onChange={setTab} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 fade-in space-y-6 pt-3">
          {tab === 'live' &&
            (isLive && hasInnings ? (
              <div className="rounded-3xl bg-secondary p-6 ring-1 ring-lborder">
                <h3 className="mb-4 text-lg font-bold text-mtext">Live Score</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <InfoStat label="Score" value={`${battingCode || '—'} ${match.displayScore || '—'}`} big />
                  <InfoStat label="Overs" value={String(inn.overs)} />
                  <InfoStat label="Run Rate" value={String(inn.runRate)} />
                </div>
                {match.lastEvent && (
                  <p className="mt-4 text-xs text-stext">
                    Last ball: over {match.lastEvent.over}, {match.lastEvent.runs} run
                    {match.lastEvent.runs === 1 ? '' : 's'} · {match.lastEvent.type}
                  </p>
                )}
                {extractBalls(timeline).length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stext">This over</p>
                    <BallTracker balls={extractBalls(timeline)} />
                  </div>
                )}
              </div>
            ) : isUpcoming ? (
              <EmptyState
                title="This match hasn't started yet"
                message={`${homeName} vs ${awayName}${date ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}.`}
              />
            ) : (
              <EmptyState
                title="No Live Data"
                message={match.status || (isCompleted || isCancelled ? 'This match has finished or was cancelled.' : 'No live data available.')}
              />
            ))}

          {tab === 'timeline' && (
            <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Ball-by-ball</h3>
              <MatchTimeline payload={timeline} upcoming={isUpcoming} />
            </div>
          )}

          {tab === 'info' && (
            <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Match Details</h3>
              <InfoRow label="Tournament" value={match.tournament || '—'} />
              <InfoRow label="Status" value={`${match.status || '—'}`} cap />
              <InfoRow label="Home" value={homeName} />
              <InfoRow label="Away" value={awayName} />
              {date && <InfoRow label="Date" value={date} />}
              {time && <InfoRow label="Time" value={time} />}
              <InfoRow label="Venue" value={match.venue || 'TBA'} />
              {match.matchStatus && <InfoRow label="Official status" value={String(match.matchStatus)} />}
            </div>
          )}

          {tab === 'result' && (isCompleted || isCancelled) && (
            <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Match Result</h3>
              {match.matchStatus && (
                <p className="mb-4 text-sm font-semibold text-mtext">{match.matchStatus}</p>
              )}
              {match.displayScore ? (
                <div className="rounded-xl bg-elevated p-4 ring-1 ring-lborder">
                  <p className="text-xs font-bold uppercase tracking-widest text-stext mb-2">Final Score</p>
                  <p className="font-mono text-2xl font-black tabular-nums text-mtext">{match.displayScore}</p>
                </div>
              ) : (
                <p className="text-sm text-stext">No final score available.</p>
              )}
            </div>
          )}
        </div>

        <aside className="lg:col-span-1 mt-3 space-y-4">
          <HeadToHeadWidget data={headToHead || null} />
          {relatedNews.length > 0 && (
            <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stext">Related news</h3>
              <ul className="space-y-2">
                {relatedNews.map((article) => (
                  <li key={article.id}>
                    <Link href={`/news/${article.slug || article.id}`} className="block text-sm font-semibold text-mtext hover:text-accent">
                      {article.title}
                    </Link>
                    <p className="text-xs text-stext">{article.date}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-8">
        <CommentsSection targetType="match" targetId={String(match.matchId || match.id || '')} />
      </div>
    </div>
  );
}

function TeamSide({ code, name, score, overs, align }: { code: string; name: string; score: string; overs: string | number; align: string }) {
  const right = align === 'right';
  return (
    <div className={`flex min-w-0 items-center gap-3 sm:gap-5 ${right ? 'flex-row-reverse justify-end text-right' : 'justify-start text-left'}`}>
      <TeamLogo code={code} name={name} size="md" className="h-12 w-12 sm:h-16 sm:w-16" link={false} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-mtext sm:text-xl tracking-tight">{name}</p>
        {score ? (
          <div className={`mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0 ${right ? 'justify-end' : 'justify-start'}`}>
            <span className="font-mono text-2xl font-black tabular-nums leading-tight text-accent sm:text-4xl tracking-tighter">
              {score}
            </span>
            {overs && <span className="font-mono text-xs font-bold text-stext sm:text-sm">{overs} ov</span>}
          </div>
        ) : (
          <p className="text-sm text-stext">—</p>
        )}
      </div>
    </div>
  );
}

function InfoStat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className={`mt-1 font-mono font-black tabular-nums tracking-tighter text-accent ${big ? 'text-4xl' : 'text-3xl'}`}>{value}</p>
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
