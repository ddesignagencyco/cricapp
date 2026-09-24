'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ClipboardList, Clock, FileText, MapPin, Newspaper, Radio, Scale, Sparkles, Swords, Trophy, Users } from 'lucide-react';
import LiveIndicator from '../LiveIndicator';
import { StatusBadge } from '../Badge';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import HeadToHeadWidget from '../HeadToHeadWidget';
import TeamLogo from '../TeamLogo';
import FavoriteButton from '../FavoriteButton';
import ShareButton from '../ShareButton';
import CommentsSection from '../CommentsSection';
import DummyAd from '../advertisements/DummyAd';
import MatchTimeline, { matchSummary } from '../MatchTimeline';
import {
  LiveStrip,
  MatchNewsPanel,
  OversFromTimeline,
  ScorecardPanel,
  SquadsPanel,
} from './MatchCentrePanels';
import { formatScheduled, getInitials } from '../../utils/helpers';
import { formatCricketOvers } from '../../lib/cricketMath';
import { buildMatchScoreboard, describeMatchResult } from '../../lib/matchScoreboard';
import { matchStatusLabel } from '../../lib/predictions';
import { fetchMatchTimeline, matchSideIds } from '../../services/matches';
import { fetchHeadToHead } from '../../services/headToHead';
import { fetchTeams } from '../../services/teams';
import { mergeMatchLivePayload, useMatchStream } from '../../hooks/useMatchStream';
import MatchPredictionTab from '../predictions/MatchPredictionTab';
import MatchOddsTab from '../odds/MatchOddsTab';
import { Skeleton } from '../skeletons/Skeletons';
import type { HeadToHead, Team } from '../../types';
import type { MatchOddsResponse } from '../../types/odds';
import { decodeEntityId, useLinkedNews } from './RelatedNewsPanel';
import { newsHref } from '../../utils/newsConstraints';

const detailTabs = [
  { key: 'live', label: 'Live', icon: Users },
  { key: 'scorecard', label: 'Scorecard', icon: ClipboardList },
  { key: 'commentary', label: 'Commentary', icon: Radio },
  { key: 'squads', label: 'Squads', icon: FileText },
  { key: 'predictions', label: 'Predictions', icon: Sparkles },
  { key: 'odds', label: 'Odds', icon: Scale },
  { key: 'h2h', label: 'Head to Head', icon: Swords },
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'info', label: 'Match Info', icon: MapPin },
];

const completedTabs = [
  { key: 'result', label: 'Result', icon: Trophy },
  { key: 'scorecard', label: 'Scorecard', icon: ClipboardList },
  { key: 'commentary', label: 'Commentary', icon: Radio },
  { key: 'squads', label: 'Squads', icon: FileText },
  { key: 'odds', label: 'Odds', icon: Scale },
  { key: 'h2h', label: 'Head to Head', icon: Swords },
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'info', label: 'Match Info', icon: MapPin },
];

interface Props {
  match: any;
  initialOdds?: MatchOddsResponse | null;
  initialOddsForbidden?: boolean;
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

function usefulScore(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text || text === '—' || text === '0/0' || text === '0') return '';
  return text;
}

function usefulResultText(value: unknown): string {
  const text = usefulScore(value);
  if (!text) return '';
  const compact = text.toLowerCase().replace(/[_-]+/g, ' ').replace(/[.\s]+$/g, '').trim();
  if (compact === 'ended' || compact === 'match ended' || compact === 'completed' || compact === 'finished') {
    return '';
  }
  return text;
}

function displaySide(match: any, index: 0 | 1) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const side = isObj ? (index === 0 ? teams.home : teams.away) : null;
  const extra = index === 0 ? match.home : match.away;
  const rawCode = side?.code || side?.abbr || extra?.code || (Array.isArray(teams) ? teams[index] : '') || '';
  const rawName = side?.name || extra?.name || match.teamNames?.[index] || '';
  const name = String(rawName || '').replace(/^sr:competitor:/, '') || (index === 0 ? 'Team A' : 'Team B');
  const codeStr = String(rawCode || '').replace(/^sr:competitor:/, '');
  const badCode = !codeStr || /^sr:/.test(codeStr) || codeStr.length > 5;
  return {
    name,
    code: badCode ? getInitials(name) : codeStr.toUpperCase(),
    raw: String(rawCode || rawName || ''),
    score: usefulScore(side?.score || extra?.score),
    overs: String(side?.overs || extra?.overs || '').trim(),
  };
}

export default function MatchDetailBody({
  match: initialMatch,
  initialOdds = null,
  initialOddsForbidden = false,
}: Props) {
  const [match, setMatch] = useState(initialMatch);
  const [tab, setTab] = useState(
    initialMatch?.status === 'completed' || initialMatch?.status === 'cancelled' ? 'result' : 'live'
  );
  const [timeline, setTimeline] = useState<Record<string, unknown> | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineReady, setTimelineReady] = useState(false);
  const [headToHead, setHeadToHead] = useState<HeadToHead | null>(null);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [h2hReady, setH2hReady] = useState(false);
  const matchId = decodeEntityId(initialMatch?.matchId || initialMatch?.id);
  const { articles: relatedNews, loading: newsLoading } = useLinkedNews({ matchId });
  const liveUpdate = useMatchStream(matchId, initialMatch?.status === 'live');
  const wantsTimeline = tab === 'commentary' || tab === 'timeline' || tab === 'scorecard' || tab === 'squads';
  const wantsH2H = tab === 'h2h';

  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  useEffect(() => {
    setTimeline(null);
    setTimelineReady(false);
    setHeadToHead(null);
    setH2hReady(false);
  }, [matchId]);

  useEffect(() => {
    if (!liveUpdate || liveUpdate.type === 'ping') return;
    const payload =
      liveUpdate.data && typeof liveUpdate.data === 'object'
        ? (liveUpdate.data as Record<string, unknown>)
        : {};
    setMatch((prev: any) => mergeMatchLivePayload(prev, payload));
  }, [liveUpdate]);

  useEffect(() => {
    if (!wantsTimeline || !matchId || timelineReady) return;
    let cancelled = false;
    setTimelineLoading(true);
    fetchMatchTimeline(matchId)
      .then((res) => {
        if (!cancelled) setTimeline(res?.payload || null);
      })
      .catch(() => {
        if (!cancelled) setTimeline(null);
      })
      .finally(() => {
        if (!cancelled) {
          setTimelineReady(true);
          setTimelineLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [wantsTimeline, matchId, timelineReady]);

  useEffect(() => {
    if (!wantsH2H || h2hReady) return;
    const sides = matchSideIds(initialMatch);
    const homeRaw = sides.home || initialMatch?.teams?.home?.code || initialMatch?.home?.code || (Array.isArray(initialMatch?.teams) ? initialMatch.teams[0] : '') || '';
    const awayRaw = sides.away || initialMatch?.teams?.away?.code || initialMatch?.away?.code || (Array.isArray(initialMatch?.teams) ? initialMatch.teams[1] : '') || '';
    let cancelled = false;
    const load = async () => {
      setH2hLoading(true);
      try {
        let teamAId = homeRaw.startsWith('sr:competitor:') ? homeRaw : '';
        let teamBId = awayRaw.startsWith('sr:competitor:') ? awayRaw : '';
        if (!teamAId || !teamBId) {
          const teams = await fetchTeams({ limit: 100 }).catch(() => [] as Team[]);
          if (cancelled) return;
          teamAId = resolveTeamId(homeRaw, teams);
          teamBId = resolveTeamId(awayRaw, teams);
        }
        if (!teamAId || !teamBId) {
          if (!cancelled) setHeadToHead(null);
          return;
        }
        const data = await fetchHeadToHead(teamAId, teamBId);
        if (!cancelled) setHeadToHead(data);
      } catch {
        if (!cancelled) setHeadToHead(null);
      } finally {
        if (!cancelled) {
          setH2hReady(true);
          setH2hLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [wantsH2H, h2hReady, initialMatch]);

  const isLive = match?.status === 'live';
  const isUpcoming = match?.status === 'upcoming';
  const isCompleted = match?.status === 'completed';
  const isCancelled = match?.status === 'cancelled';
  const showPredictions = isLive || isUpcoming;
  const activeTabs = isCompleted || isCancelled ? completedTabs : detailTabs;

  useEffect(() => {
    if (!showPredictions && tab === 'predictions') setTab(isCompleted || isCancelled ? 'result' : 'live');
    if (tab === 'stats') setTab('scorecard');
  }, [showPredictions, tab, isCompleted, isCancelled]);

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
  const phaseRaw = String(match.matchStatus || '');
  const phase = matchStatusLabel(phaseRaw);
  const timelineSummary = matchSummary(timeline);
  const displayScore = usefulScore(match.displayScore) || usefulScore(timelineSummary.displayScore);
  const board = buildMatchScoreboard({
    home: {
      code: home.code,
      name: home.name,
      raw: home.raw,
      score: home.score || timelineSummary.homeScore,
      overs: home.overs,
    },
    away: {
      code: away.code,
      name: away.name,
      raw: away.raw,
      score: away.score || timelineSummary.awayScore,
      overs: away.overs,
    },
    battingTeam: String(inn?.battingTeam || ''),
    matchStatus: phaseRaw,
    innRuns: Number(inn?.runs),
    innWkts: Number(inn?.wickets),
    innOvers: Number(inn?.overs),
    innRr: Number(inn?.runRate),
    displayScore,
    live: !isUpcoming,
  });
  const {
    homeScore,
    awayScore,
    homeOvers,
    awayOvers,
    scoreLine,
    oversLabel,
    rrLabel,
    battingLabel,
  } = board;
  const usefulOvers = Boolean(oversLabel);
  const usefulRr = Boolean(rrLabel && rrLabel !== '—');
  const hasInnings = Boolean(scoreLine) || usefulOvers;
  const resultText =
    usefulResultText(match.result) ||
    usefulResultText(timelineSummary.result) ||
    describeMatchResult(match);
  const finalScoreLine = [homeScore && `${homeCode} ${homeScore}`, awayScore && `${awayCode} ${awayScore}`]
    .filter(Boolean)
    .join('  ·  ') || displayScore;

  const { date, time } = formatScheduled(match.scheduled);
  const breadcrumbName = `${homeName} vs ${awayName}`;

  return (
    <div className="match-detail-page mx-auto max-w-7xl space-y-4 px-4 py-6 sm:space-y-5 sm:px-6 sm:py-8">
      <nav className="match-detail-breadcrumb text-stext" aria-label="Breadcrumb">
        <Link href="/matches" className="font-semibold text-accent transition-colors hover:text-mtext">
          Matches
        </Link>
        <span className="text-stext" aria-hidden="true">
          /
        </span>
        <span className="truncate font-medium text-mtext max-w-[12rem] sm:max-w-none">{breadcrumbName}</span>
      </nav>

      <header
        className={`match-detail-hero p-4 sm:p-8 ${isLive ? 'match-detail-hero--live' : ''}`}
      >

        {/* Top Badges & Actions */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-lborder/60 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-black tracking-wider text-accent border border-accent/20">
              {match.tournament || 'Match Fixture'}
            </span>
            {match.format && (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold tracking-wider text-stext border border-lborder/60">
                {match.format}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLive ? (
              <LiveIndicator />
            ) : (
              <StatusBadge status={match.status} />
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
        <div className="relative mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-8">
          <TeamSide
            code={homeCode}
            name={homeName}
            score={homeScore}
            overs={homeOvers}
            align="left"
          />

          <div className="flex shrink-0 flex-col items-center justify-center">
            <div className="match-detail-vs sm:h-12 sm:w-12">
              <span className="font-mono text-[10px] font-black italic tracking-wider text-stext sm:text-xs">VS</span>
            </div>
            {match.round && (
              <span className="mt-1 hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:block">
                {match.round}
              </span>
            )}
          </div>

          <TeamSide
            code={awayCode}
            name={awayName}
            score={awayScore}
            overs={awayOvers}
            align="right"
          />
        </div>

        {(isCompleted || isCancelled) && resultText ? (
          <p className="match-detail-result-banner" role="status">
            {resultText}
          </p>
        ) : null}

        {hasInnings && scoreLine && (
          <div className="match-detail-stat-band relative mt-5 grid grid-cols-2 text-xs sm:grid-cols-5">
            <InningsStat label="Batting" value={battingLabel || '—'} />
            <InningsStat label="Score" value={scoreLine} />
            <InningsStat label="Overs" value={usefulOvers ? `${oversLabel} ov` : '—'} />
            <InningsStat label="RR" value={usefulRr ? rrLabel : '—'} />
            <InningsStat label="Innings" value={phase || '—'} className="col-span-2 sm:col-span-1" />
            {match.lastEvent?.type && match.lastEvent.type !== 'none' ? (
              <p className="col-span-2 text-[11px] font-semibold text-stext sm:col-span-5">
                Last ball: {match.lastEvent.type} +{match.lastEvent.runs ?? 0}
              </p>
            ) : null}
          </div>
        )}

        {/* Matchday Meta Footer */}
        {(date || time || match.venue) && (
          <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-lborder/60 pt-4">
            {date && (
              <span className="match-detail-meta-pill">
                <Calendar size={13} className="shrink-0 text-accent" aria-hidden="true" />
                {date}
              </span>
            )}
            {time && (
              <span className="match-detail-meta-pill">
                <Clock size={13} className="shrink-0 text-accent" aria-hidden="true" />
                {time}
              </span>
            )}
            {match.venue && (
              <span className="match-detail-meta-pill max-w-full">
                <MapPin size={13} className="shrink-0 text-accent" aria-hidden="true" />
                <span className="truncate">{match.venue}</span>
              </span>
            )}
          </div>
        )}
      </header>

      <div className="py-3 sm:py-4">
        <DummyAd size="leaderboard" placement="match-detail-after-overview" />
      </div>

      <div className="match-detail-tabs-sticky">
        <Tabs tabs={activeTabs} active={tab} onChange={setTab} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        <div className="min-w-0 fade-in space-y-6 pt-1 lg:pt-3">
          {tab === 'live' &&
            (isLive && hasInnings ? (
              <div className="match-detail-panel match-detail-panel-pad bg-secondary">
                <h3 className="mb-4 text-lg font-bold text-mtext">Live Score</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <InfoStat label="Score" value={`${battingLabel} ${scoreLine || match.displayScore || '—'}`} big />
                  <InfoStat label="Overs" value={usefulOvers ? oversLabel : '—'} />
                  <InfoStat label="Run Rate" value={usefulRr ? rrLabel : '—'} />
                </div>
                {match.lastEvent?.type && match.lastEvent.type !== 'none' && (
                  <p className="mt-4 text-xs text-stext">
                    Last ball: over {formatCricketOvers(match.lastEvent.over) || match.lastEvent.over}, {match.lastEvent.runs} run
                    {match.lastEvent.runs === 1 ? '' : 's'} · {match.lastEvent.type}
                  </p>
                )}
                <LiveStrip match={match} />
                <OversFromTimeline timeline={timeline} inning={/second_innings|2nd/i.test(phaseRaw) ? 2 : 1} />
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

          {tab === 'predictions' && showPredictions && (
            <MatchPredictionTab match={match} />
          )}

          {tab === 'odds' && !isCancelled && (
            <MatchOddsTab
              match={match}
              initialOdds={initialOdds}
              initialOddsForbidden={initialOddsForbidden}
            />
          )}

          {(tab === 'commentary' || tab === 'timeline') && (
            timelineLoading || !timelineReady ? (
              <TabPanelLoader />
            ) : (
              <div className="match-detail-panel match-detail-panel-pad">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Ball-by-ball</h3>
                <MatchTimeline payload={timeline} upcoming={isUpcoming} />
              </div>
            )
          )}

          {tab === 'h2h' && (
            h2hLoading || !h2hReady ? (
              <TabPanelLoader />
            ) : (
              <HeadToHeadWidget data={headToHead} />
            )
          )}

          {tab === 'scorecard' && (
            timelineLoading || !timelineReady ? <TabPanelLoader /> : <ScorecardPanel match={match} timeline={timeline} />
          )}

          {tab === 'squads' && (
            timelineLoading || !timelineReady ? (
              <TabPanelLoader />
            ) : (
              <SquadsPanel match={match} homeName={homeName} awayName={awayName} timeline={timeline} />
            )
          )}

          {tab === 'news' && <MatchNewsPanel articles={relatedNews} loading={newsLoading} />}

          {tab === 'info' && (
            <div className="match-detail-panel match-detail-panel-pad">
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
            <div className="match-detail-panel match-detail-panel-pad">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Match Result</h3>
              {resultText ? (
                <p className="mb-4 text-base font-semibold text-mtext">{resultText}</p>
              ) : null}
              {homeScore || awayScore || finalScoreLine ? (
                <div className="space-y-3 rounded-xl bg-elevated p-4 ring-1 ring-lborder">
                  <p className="text-xs font-bold uppercase tracking-widest text-stext">Final score</p>
                  <div className="space-y-2">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-mtext">{homeName}</span>
                      <span className="font-mono text-xl font-black tabular-nums text-mtext">{homeScore || '—'}</span>
                    </p>
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-mtext">{awayName}</span>
                      <span className="font-mono text-xl font-black tabular-nums text-mtext">{awayScore || '—'}</span>
                    </p>
                  </div>
                  {timelineSummary.scores.length > 0 ? (
                    <p className="font-mono text-xs text-stext">{timelineSummary.scores.join(' · ')}</p>
                  ) : null}
                  {!homeScore && !awayScore && finalScoreLine ? (
                    <p className="font-mono text-lg font-black tabular-nums text-mtext">{finalScoreLine}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-stext">No final score stored for this match yet.</p>
              )}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-5 lg:mt-3 lg:space-y-6">
          <div className="flex justify-center lg:justify-start">
            <DummyAd size="medium-rectangle" placement="match-detail-sidebar" />
          </div>
          {relatedNews.length > 0 && (
            <div className="match-detail-aside-card">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-stext">Related news</h3>
              <ul className="space-y-2">
                {relatedNews.map((article) => (
                  <li key={article.id}>
                    <Link href={newsHref(article)} className="block text-sm font-semibold text-mtext hover:text-accent">
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
        <CommentsSection targetType="match" targetId={matchId || String(match.matchId || match.id || '')} />
      </div>
    </div>
  );
}

function TabPanelLoader() {
  return (
    <div className="match-detail-panel match-detail-panel-pad" aria-busy="true">
      <Skeleton height={18} width={160} />
      <div className="mt-5 space-y-3">
        <Skeleton height={40} />
        <Skeleton height={40} />
        <Skeleton height={40} />
      </div>
    </div>
  );
}

function InningsStat({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-stext">{label}</p>
      <p className="mt-0.5 truncate font-mono text-sm font-bold tabular-nums text-mtext">{value}</p>
    </div>
  );
}

function TeamSide({ code, name, score, overs, align }: { code: string; name: string; score: string; overs: string | number; align: string }) {
  const right = align === 'right';
  return (
    <div className={`flex min-w-0 items-center gap-2 sm:gap-4 ${right ? 'flex-row-reverse text-right' : 'text-left'}`}>
      <TeamLogo code={code} name={name} size="md" className="h-10 w-10 shrink-0 sm:h-16 sm:w-16" link={false} />
      <div className="min-w-0">
        <p className="truncate text-xs font-black tracking-tight text-mtext sm:text-lg">{name}</p>
        {score ? (
          <div className="mt-0.5">
            <p className="font-mono text-xl font-black tabular-nums leading-none tracking-tighter text-accent sm:text-4xl">
              {score}
            </p>
            {overs ? (
              <p className="mt-1 font-mono text-[10px] font-bold tabular-nums text-stext sm:text-sm">{overs} ov</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-stext">—</p>
        )}
      </div>
    </div>
  );
}

function InfoStat({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="match-detail-panel match-detail-panel-pad !p-4 sm:!p-5">
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
