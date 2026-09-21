'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Calendar, ClipboardList, Clock, FileText, MapPin, Newspaper, Radio, Sparkles, Trophy, Users } from 'lucide-react';
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
  StatsPanel,
} from './MatchCentrePanels';
import { formatScheduled } from '../../utils/helpers';
import { matchStatusLabel } from '../../lib/predictions';
import { fetchMatchTimeline, matchSideIds } from '../../services/matches';
import { fetchHeadToHead } from '../../services/headToHead';
import { fetchTeams } from '../../services/teams';
import { getInitials } from '../../utils/helpers';
import { mergeMatchLivePayload, useMatchStream } from '../../hooks/useMatchStream';
import MatchPredictionTab from '../predictions/MatchPredictionTab';
import type { Team } from '../../types';
import { decodeEntityId, useLinkedNews } from './RelatedNewsPanel';
import { newsHref } from '../../utils/newsConstraints';

const detailTabs = [
  { key: 'live', label: 'Live', icon: Users },
  { key: 'scorecard', label: 'Scorecard', icon: ClipboardList },
  { key: 'commentary', label: 'Commentary', icon: Radio },
  { key: 'squads', label: 'Squads', icon: FileText },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
  { key: 'predictions', label: 'Predictions', icon: Sparkles },
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'info', label: 'Match Info', icon: MapPin },
];

const completedTabs = [
  { key: 'result', label: 'Result', icon: Trophy },
  { key: 'scorecard', label: 'Scorecard', icon: ClipboardList },
  { key: 'commentary', label: 'Commentary', icon: Radio },
  { key: 'squads', label: 'Squads', icon: FileText },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
  { key: 'news', label: 'News', icon: Newspaper },
  { key: 'info', label: 'Match Info', icon: MapPin },
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

export default function MatchDetailBody({ match: initialMatch, headToHead: initialHeadToHead }: Props) {
  const [match, setMatch] = useState(initialMatch);
  const [tab, setTab] = useState(
    initialMatch?.status === 'completed' || initialMatch?.status === 'cancelled' ? 'result' : 'live'
  );
  const [timeline, setTimeline] = useState<Record<string, unknown> | null>(null);
  const [headToHead, setHeadToHead] = useState(initialHeadToHead || null);
  const matchId = decodeEntityId(initialMatch?.matchId || initialMatch?.id);
  const { articles: relatedNews, loading: newsLoading } = useLinkedNews({ matchId });
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
    setMatch((prev: any) => mergeMatchLivePayload(prev, payload));
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
  const showPredictions = isLive || isUpcoming;
  const activeTabs = isCompleted || isCancelled ? completedTabs : detailTabs;

  useEffect(() => {
    if (!showPredictions && tab === 'predictions') setTab(isCompleted || isCancelled ? 'result' : 'live');
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
  const battingCode = String(inn?.battingTeam || '');
  const sideMatches = (side: { code: string; name: string; raw: string }, value: string) => {
    const needle = String(value || '').replace(/^sr:competitor:/, '').toLowerCase();
    if (!needle) return false;
    return [side.code, side.name, side.raw].some((part) => {
      const hay = String(part || '').replace(/^sr:competitor:/, '').toLowerCase();
      return hay === needle || hay.startsWith(needle) || needle.startsWith(hay);
    });
  };
  const phaseRaw = String(match.matchStatus || '');
  const phase = matchStatusLabel(phaseRaw);
  const battingFromStatus = /second_innings_home|first_innings_home|home_batting/i.test(phaseRaw)
    ? 'home'
    : /second_innings_away|first_innings_away|away_batting/i.test(phaseRaw)
      ? 'away'
      : null;
  const battingIsHome = battingFromStatus === 'home'
    || battingFromStatus === 'away'
      ? battingFromStatus === 'home'
      : Boolean(battingCode) && sideMatches(home, battingCode)
        ? true
        : Boolean(battingCode) && sideMatches(away, battingCode)
          ? false
          : true;
  const timelineSummary = matchSummary(timeline);
  const displayScore = usefulScore(match.displayScore) || usefulScore(timelineSummary.displayScore);
  const parsedScore = String(displayScore).replace(/\s+/g, '').match(/^(\d+)\/(\d+)/);
  const innRuns = Number(inn?.runs);
  const innWkts = Number(inn?.wickets);
  const innOvers = Number(inn?.overs);
  const innRr = Number(inn?.runRate);
  const usefulInnScore = Number.isFinite(innRuns) && innRuns > 0;
  const scoreLine = usefulInnScore
    ? `${innRuns}/${Number.isFinite(innWkts) ? innWkts : 0}`
    : parsedScore
      ? `${parsedScore[1]}/${parsedScore[2]}`
      : '';
  const usefulOvers = Number.isFinite(innOvers) && innOvers > 0;
  const usefulRr = Number.isFinite(innRr) && innRr > 0;
  const hasInnings = Boolean(scoreLine) || usefulOvers;
  const battingLabel = battingIsHome ? homeCode : awayCode;
  const resultText = usefulResultText(match.result) || usefulResultText(timelineSummary.result);

  let homeScore = home.score || timelineSummary.homeScore;
  let awayScore = away.score || timelineSummary.awayScore;
  let homeOvers: string | number = home.overs;
  let awayOvers: string | number = away.overs;

  if (!isUpcoming && scoreLine && !homeScore && !awayScore) {
    if (battingIsHome) {
      homeScore = scoreLine;
      homeOvers = usefulOvers ? innOvers : homeOvers;
    } else {
      awayScore = scoreLine;
      awayOvers = usefulOvers ? innOvers : awayOvers;
    }
  }

  const finalScoreLine = [homeScore && `${homeCode} ${homeScore}`, awayScore && `${awayCode} ${awayScore}`]
    .filter(Boolean)
    .join('  ·  ') || displayScore;

  const { date, time } = formatScheduled(match.scheduled);
  const breadcrumbName = `${homeName} vs ${awayName}`;

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/matches" className="hover:text-accent transition-colors">Matches</Link>
        <span>/</span>
        <span className="text-mtext truncate max-w-[200px] sm:max-w-none font-medium">{breadcrumbName}</span>
      </nav>

      <header className="relative overflow-hidden rounded-3xl border border-lborder bg-card p-4 shadow-sm sm:p-8">
        {isLive && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-danger" />
        )}

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
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-lborder bg-secondary sm:h-12 sm:w-12 sm:rounded-2xl">
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

        {hasInnings && scoreLine && (
          <div className="relative mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-lborder/60 bg-secondary/80 p-3 text-xs font-semibold text-stext">
            <span className="flex items-center gap-1.5 text-mtext">
              <BarChart3 size={14} className="text-accent" />
              <span className="font-bold text-accent">{battingLabel}</span> {scoreLine}
            </span>
            {usefulOvers && (
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-accent" />
                {innOvers} ov{usefulRr ? ` · RR ${innRr}` : ''}
              </span>
            )}
            {phase && (
              <span className="capitalize">{phase}</span>
            )}
            {match.lastEvent?.type && match.lastEvent.type !== 'none' && (
              <span className="rounded-lg border border-lborder/60 bg-card px-2 py-1 text-xs font-bold text-mtext">
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

      <div className="py-5">
        <DummyAd size="leaderboard" placement="match-detail-after-overview" />
      </div>

      <div className="mt-4">
        <Tabs tabs={activeTabs} active={tab} onChange={setTab} />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 fade-in space-y-6 pt-3">
          {tab === 'live' &&
            (isLive && hasInnings ? (
              <div className="rounded-3xl bg-secondary p-6 ring-1 ring-lborder">
                <h3 className="mb-4 text-lg font-bold text-mtext">Live Score</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <InfoStat label="Score" value={`${battingLabel} ${scoreLine || match.displayScore || '—'}`} big />
                  <InfoStat label="Overs" value={usefulOvers ? String(innOvers) : '—'} />
                  <InfoStat label="Run Rate" value={usefulRr ? String(innRr) : '—'} />
                </div>
                {match.lastEvent && (
                  <p className="mt-4 text-xs text-stext">
                    Last ball: over {match.lastEvent.over}, {match.lastEvent.runs} run
                    {match.lastEvent.runs === 1 ? '' : 's'} · {match.lastEvent.type}
                  </p>
                )}
                <LiveStrip match={match} />
                <OversFromTimeline timeline={timeline} />
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

          {(tab === 'commentary' || tab === 'timeline') && (
            <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Ball-by-ball</h3>
              <MatchTimeline payload={timeline} upcoming={isUpcoming} />
            </div>
          )}

          {tab === 'scorecard' && <ScorecardPanel match={match} />}

          {tab === 'squads' && (
            <SquadsPanel match={match} homeName={homeName} awayName={awayName} />
          )}

          {tab === 'stats' && <StatsPanel match={match} />}

          {tab === 'news' && <MatchNewsPanel articles={relatedNews} loading={newsLoading} />}

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

        <aside className="mt-3 min-w-0 space-y-6">
          <div className="flex justify-center lg:justify-start">
            <DummyAd size="medium-rectangle" placement="match-detail-sidebar" />
          </div>
          <HeadToHeadWidget data={headToHead || null} />
          {relatedNews.length > 0 && (
            <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stext">Related news</h3>
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
        <CommentsSection targetType="match" targetId={String(match.matchId || match.id || '')} />
      </div>
    </div>
  );
}

function TeamSide({ code, name, score, overs, align }: { code: string; name: string; score: string; overs: string | number; align: string }) {
  const right = align === 'right';
  return (
    <div className={`flex min-w-0 items-center gap-2 sm:gap-4 ${right ? 'flex-row-reverse text-right' : 'text-left'}`}>
      <TeamLogo code={code} name={name} size="sm" className="h-9 w-9 shrink-0 sm:h-14 sm:w-14" link={false} />
      <div className="min-w-0">
        <p className="truncate text-xs font-black tracking-tight text-mtext sm:text-lg">{name}</p>
        {score ? (
          <p className="mt-0.5 font-mono text-xl font-black tabular-nums leading-none tracking-tighter text-accent sm:text-4xl">
            {score}
            {overs ? <span className="ml-1 font-mono text-[10px] font-bold text-stext sm:text-sm">{overs} ov</span> : null}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-stext">—</p>
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
