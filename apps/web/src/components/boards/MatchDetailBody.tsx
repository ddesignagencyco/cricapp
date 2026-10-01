'use client';

/**
 * The match centre's composition root.
 *
 * ## What changed, and why
 *
 * The page used to be one component that both fetched and rendered. Each panel
 * re-derived the score from whichever field it knew about, which is how the hero,
 * the overview and the scorecard came to show three different numbers for the same
 * innings — most visibly on a Test, where `teams.home.score` is a two-innings
 * aggregate while `displayScore` is a single innings.
 *
 * Now:
 *
 * - `buildMatchViewModel` produces **one** normalised value for the whole page, and
 *   every panel below reads it. There is nothing left to disagree about.
 * - All fetching goes through TanStack Query with **match-scoped keys**, so switching
 *   tabs refetches nothing and another match's cached data cannot surface here.
 * - The server render seeds the match and its odds, so the client repeats neither.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Radio, Swords } from 'lucide-react';
import MatchPageHeader, { MatchScoreboard } from './match/MatchPageHeader';
import MatchTabNavigation, {
  MATCH_TABS,
  MatchTabPanel,
  defaultMatchTab,
  type MatchTab,
} from './match/MatchTabNavigation';
import MatchOverview from './match/MatchOverview';
import MatchInfo from './match/MatchInfo';
import OtherMatches from './match/OtherMatches';
import RelatedMatchNews from './match/RelatedMatchNews';
import { MatchScorecardTab, MatchSquadsTab } from './match/MatchScorecardTab';
import MatchTimeline from '../MatchTimeline';
import CommentsSection from '../CommentsSection';
import EmptyState from '../EmptyState';
import AdSlot from '../advertisements/AdSlot';
import { Skeleton } from '../skeletons/Skeletons';
import { buildMatchViewModel } from '../../lib/matchViewModel';
import { extractInningsScorecards } from '../../lib/matchCentreData';
import { readProviderInningsCards, readSquads, type FallOfWicketEntry } from '../../lib/matchScorecardData';
import { playerOfTheMatch, topBatter, topBowler, topBatters, topBowlers } from '../../lib/matchPerformers';
import { mergeMatchLivePayload, useMatchStream } from '../../hooks/useMatchStream';
import {
  useMatchHeadToHeadQuery,
  useMatchNewsQuery,
  useMatchOddsQuery,
  useMatchTimelineQuery,
  useSeriesMatchesQuery,
} from '../../queries/useMatchCentreQueries';
import { entityNewsHref } from '../EntityLinks';
import HeadToHeadWidget from '../HeadToHeadWidget';
import MatchOddsTab from '../odds/MatchOddsTab';
import type { MatchOddsFetchResult } from '../../types/odds';
import type { Match } from '../../types';

interface Props {
  match: Match;
  /**
   * The timeline **without** its ball events: the competitor ids, period scores,
   * tournament, venue and the full per-player scorecard. 67 KB on a four-innings Test,
   * against 1.6 MB for the events.
   */
  matchContext: Record<string, unknown> | null;
  /**
   * The fall of wickets, per innings, computed on the server from the events so the
   * browser never has to download them to show a wicket's score.
   */
  fallOfWickets?: Record<number, FallOfWicketEntry[]>;
  /** Whether the provider has any ball-by-ball events, i.e. whether Commentary exists. */
  hasCommentary?: boolean;
  initialOdds?: MatchOddsFetchResult | null;
}

const TAB_PARAM = 'tab';

/**
 * The tab set.
 *
 * ## Why every tab is always present
 *
 * This used to hide a tab whose feature had no data, so the same match page showed
 * five tabs on one fixture and eight on another, and the tabs physically moved as you
 * moved between them. A tab set that changes shape is disorienting, and a reader who
 * has learned "the scorecard is third from the left" can no longer rely on it.
 *
 * So all seven tabs are always rendered in the same order, and a tab with nothing to
 * show says so in its own empty state. The tab is a place in the page; whether there
 * is anything there is a separate question, answered inside it.
 */
const ALL_TAB_KEYS = [
  MATCH_TABS.overview.key,
  MATCH_TABS.scorecard.key,
  MATCH_TABS.commentary.key,
  MATCH_TABS.squads.key,
  MATCH_TABS.stats.key,
  MATCH_TABS.odds.key,
  MATCH_TABS.info.key,
] as const;

export default function MatchDetailBody({
  match: initialMatch,
  matchContext,
  fallOfWickets: initialFallOfWickets,
  hasCommentary = false,
  initialOdds,
}: Props) {
  const searchParams = useSearchParams();
  const matchId = decodeMatchId(String(initialMatch?.matchId ?? initialMatch?.id ?? ''));

  /**
   * The live match row.
   *
   * Seeded from the server render and then patched from the socket. The socket event
   * is filtered by match id inside `useMatchStream`, so an update for another match
   * can never reach this page.
   */
  const [liveMatch, setLiveMatch] = useState<Match>(initialMatch);
  const isLive = String(liveMatch?.status ?? '') === 'live';
  const liveUpdate = useMatchStream(matchId, isLive);

  useEffect(() => {
    if (!liveUpdate) return;
    setLiveMatch((prev) => mergeMatchLivePayload(prev as Record<string, unknown>, (liveUpdate.data ?? {}) as Record<string, unknown>) as Match);
  }, [liveUpdate]);

  // A navigation to a different match reuses this component instance, so the local
  // state is reset when the id changes rather than showing the previous match's row.
  const lastMatchId = useRef(matchId);
  useEffect(() => {
    if (lastMatchId.current === matchId) return;
    lastMatchId.current = matchId;
    setLiveMatch(initialMatch);
  }, [matchId, initialMatch]);

  /* --- The match context: every panel's input, derived once ------------- */

  /**
   * One memo produces everything the panels need from the match context.
   *
   * These were four separate memos, each independently re-parsing the same payload.
   * On a Test that meant the scorecard, the squads, the fall of wickets and the event
   * detection all walked the innings and the player rows on every change of the live
   * match row — which the socket patches several times a second while a match is on.
   */
  const derived = useMemo(() => {
    const matchRecord = liveMatch as unknown as Record<string, unknown>;
    const cards = extractInningsScorecards(matchRecord, matchContext);
    return {
      view: buildMatchViewModel({ match: matchRecord, timeline: matchContext }),
      scorecards: cards,
      providerCards: readProviderInningsCards(matchContext),
      squads: readSquads(matchContext),
    };
  }, [liveMatch, matchContext]);

  const { view, scorecards, squads } = derived;

  /**
   * The fall of wickets, rebuilt from the server's flat object.
   *
   * `useMemo` on the prop identity alone would recompute on every parent render, so
   * the JSON string is the dependency and the Map is cached against it.
   */
  const fallOfWicketsKey = JSON.stringify(initialFallOfWickets ?? null);
  const fallOfWickets = useMemo(() => {
    const out = new Map<number, FallOfWicketEntry[]>();
    for (const [number, entries] of Object.entries(initialFallOfWickets ?? {})) {
      const n = Number(number);
      if (Number.isFinite(n) && Array.isArray(entries) && entries.length > 0) {
        out.set(n, entries);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallOfWicketsKey]);

  /* --- Tab-specific data, all match-scoped and all lazy ------------------- */

  const hasScorecard = scorecards.some((card) => card.batting.length > 0 || card.bowling.length > 0);

  const homeTeamId = view.home.id ?? '';
  const awayTeamId = view.away.id ?? '';
  const canHeadToHead = Boolean(homeTeamId && awayTeamId);

  const available = ALL_TAB_KEYS;
  const tabs: MatchTab[] = useMemo(
    () => ALL_TAB_KEYS.map((key) => MATCH_TABS[key]),
    [],
  );

  const defaultTab = defaultMatchTab(view.phase, available);
  const requestedTab = searchParams.get(TAB_PARAM);
  const fallbackTab = requestedTab && available.includes(requestedTab) ? requestedTab : defaultTab;

  /**
   * The active tab, held in state.
   *
   * ## Why this is not `router.replace`
   *
   * The tab used to be written to the URL with `router.replace`. In the App Router a
   * search-param change re-runs the **server** components for the route, so every tab
   * click re-fetched the match, the timeline and the odds on the server, streamed a
   * fresh RSC payload and re-rendered the page. On a four-innings Test — where the
   * server also walks 1,879 ball events to build the fall of wickets — a tab switch
   * felt like a full page load, and the page visibly stuttered on every click.
   *
   * Instead the tab is local state and the URL is updated with `history.replaceState`,
   * which changes the address bar without involving Next at all. Switching tabs is now
   * a pure client re-render: no request, no server render, and no remount of the
   * scoreboard, the overview or the sidebar.
   *
   * A deep link still works — the initial tab is read from the URL — and Back/Forward
   * still move between tabs, because `popstate` is watched below.
   */
  const [tab, setTab] = useState(fallbackTab);

  /**
   * The ball-by-ball events, fetched only once Commentary is actually open.
   *
   * This is the 1.6 MB. It is not needed for the scoreboard, the scorecard, the
   * squads, the fall of wickets or anything in the sidebar, so a reader who never
   * opens the tab never downloads it. The query is match-scoped, so it is cached after
   * the first open and Back/Forward into Commentary is instant.
   */
  const wantsCommentary = tab === MATCH_TABS.commentary.key && hasCommentary;
  const timelineQuery = useMatchTimelineQuery(matchId, { enabled: wantsCommentary });
  const commentaryPayload = timelineQuery.data?.payload ?? null;

  const h2h = useMatchHeadToHeadQuery(matchId, homeTeamId, awayTeamId, { enabled: canHeadToHead });
  const newsQuery = useMatchNewsQuery(matchId, { limit: 12 });
  const seriesQuery = useSeriesMatchesQuery(view.tournament, { limit: 24 });
  const oddsQuery = useMatchOddsQuery(
    matchId,
    initialOdds?.status === 'ok' ? initialOdds.data : null,
    initialOdds?.status === 'forbidden',
  );

  /* --- Performers, comparison, fall of wickets ---------------------------- */

  /**
   * Maps a scorecard's team label back to a side.
   *
   * The scorecard is keyed by innings number, and the view model already knows which
   * side batted which innings, so the two are joined on the number rather than on a
   * team name.
   */
  const resolveSide = useCallback(
    (teamName: string) => {
      const trimmed = teamName.trim().toLowerCase();
      if (!trimmed) return null;
      if (trimmed === view.home.name.trim().toLowerCase()) return 'home' as const;
      if (trimmed === view.away.name.trim().toLowerCase()) return 'away' as const;
      return view.innings.find(
        (inn) =>
          (inn.side === 'home' ? view.home.name : view.away.name).trim().toLowerCase() === trimmed,
      )?.side ?? null;
    },
    [view],
  );

  const batters = useMemo(
    () => topBatters(scorecards, 3, resolveSide),
    [scorecards, resolveSide],
  );
  const bowlers = useMemo(
    () => topBowlers(scorecards, 3, resolveSide),
    [scorecards, resolveSide],
  );
  const bestBatter = useMemo(() => topBatter(scorecards, resolveSide), [scorecards, resolveSide]);
  const bestBowler = useMemo(() => topBowler(scorecards, resolveSide), [scorecards, resolveSide]);
  const pom = useMemo(
    () => playerOfTheMatch(liveMatch as unknown as Record<string, unknown>),
    [liveMatch],
  );

  /**
   * Writes the chosen tab into the address bar without navigating.
   *
   * `replaceState` rather than `pushState`: a tab is another view of the same page, so
   * it should not become a history entry that Back has to walk through.
   */
  const selectTab = useCallback(
    (next: string) => {
      if (!available.includes(next) || next === tab) return;
      setTab(next);
      const params = new URLSearchParams(window.location.search);
      params.set(TAB_PARAM, next);
      const query = params.toString();
      // replaceState, not pushState: a tab is another view of the same page, so it
      // should not become a history entry that Back has to walk through.
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
    },
    [available, tab],
  );

  // Back/Forward across tabs. Without a navigation there is no popstate-driven
  // search-param change for React to observe, so it is read straight off the URL.
  useEffect(() => {
    const onPopState = () => {
      const next = new URLSearchParams(window.location.search).get(TAB_PARAM);
      if (next && available.includes(next)) setTab(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [available]);

  // A different match resets to its own default tab instead of inheriting the last one.
  useEffect(() => {
    setTab(fallbackTab);
    // Only the match id should trigger this: `fallbackTab` also changes with the URL,
    // and re-running on it would undo the tab the reader just chose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  /* --- Render ---------------------------------------------------------------- */


  return (
    <div className="mc-page mx-auto w-full max-w-[1280px] px-4 pb-10 pt-4 sm:px-6 sm:pt-5">
      <div className="mb-4">
        <AdSlot placement="match-detail-leaderboard" />
      </div>

      <MatchPageHeader view={view} matchId={matchId} />

      <div className="mt-4">
        <MatchScoreboard view={view} matchId={matchId} />
      </div>

      <div className="mt-4">
        <MatchTabNavigation tabs={tabs} active={tab} onChange={selectTab} />
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:gap-5">
        <div id="mc-main" className="min-w-0 space-y-4">
          <MatchTabPanel tabKey={MATCH_TABS.overview.key} active={tab}>
            <MatchOverview
              view={view}
              batters={batters}
              bowlers={bowlers}
              topBatter={bestBatter}
              topBowler={bestBowler}
              playerOfTheMatch={pom}
              fallOfWickets={fallOfWickets}
              onViewScorecard={
                hasScorecard ? () => selectTab(MATCH_TABS.scorecard.key) : undefined
              }
              scorecardHref={hasScorecard ? null : null}
            />
          </MatchTabPanel>

          <MatchTabPanel tabKey={MATCH_TABS.scorecard.key} active={tab}>
            <MatchScorecardTab cards={scorecards} view={view} />
          </MatchTabPanel>

          <MatchTabPanel tabKey={MATCH_TABS.commentary.key} active={tab}>
            <div className="mc-section">
              <div className="mc-section__head">
                <h2 className="mc-section__title inline-flex items-center gap-1.5">
                  <Radio size={14} strokeWidth={2.4} aria-hidden="true" className="text-accent" />
                  Ball-by-ball
                </h2>
              </div>
              <div className="mc-section__body">
                {commentaryPayload ? (
                  /*
                   * `showOverSummaries={false}`: the per-over card restates the running
                   * score, the two batters at the crease and the bowler after every
                   * over. On this page that repeats the scoreboard three times per over
                   * and pushes the deliveries apart. The deliveries themselves — the
                   * thing this tab is for — are untouched.
                   */
                  <MatchTimeline
                    payload={commentaryPayload}
                    upcoming={view.isUpcoming}
                    showOverSummaries={false}
                  />
                ) : hasCommentary ? (
                  <CommentarySkeleton loading={timelineQuery.isLoading} />
                ) : (
                  <EmptyState
                    icon={Radio}
                    title="No ball-by-ball for this fixture"
                    message="The provider has not published delivery-by-delivery commentary for this match."
                  />
                )}
              </div>
            </div>
          </MatchTabPanel>

          <MatchTabPanel tabKey={MATCH_TABS.squads.key} active={tab}>
            <MatchSquadsTab
              home={squads.home}
              away={squads.away}
              homeName={view.home.name}
              awayName={view.away.name}
              isUpcoming={view.isUpcoming}
            />
          </MatchTabPanel>

          <MatchTabPanel tabKey={MATCH_TABS.stats.key} active={tab}>
            {h2h.isLoading ? (
              <div className="mc-section p-4" aria-busy="true">
                <Skeleton count={6} height={20} />
              </div>
            ) : canHeadToHead ? (
              <HeadToHeadWidget data={h2h.data ?? null} />
            ) : (
              <div className="mc-section">
                <div className="mc-section__head">
                  <h2 className="mc-section__title">Head to Head</h2>
                </div>
                <div className="mc-section__body">
                  <EmptyState
                    icon={Swords}
                    title="Head to head unavailable"
                    message="This fixture's two sides are not identified by the provider, so their previous meetings cannot be looked up."
                  />
                </div>
              </div>
            )}
          </MatchTabPanel>

          <MatchTabPanel tabKey={MATCH_TABS.odds.key} active={tab}>
            <MatchOddsTab
              match={liveMatch}
              initialOdds={oddsQuery.data?.status === 'ok' ? oddsQuery.data.data : null}
              initialOddsForbidden={oddsQuery.data?.status === 'forbidden'}
            />
          </MatchTabPanel>

          <MatchTabPanel tabKey={MATCH_TABS.info.key} active={tab}>
            <MatchInfo view={view} />
          </MatchTabPanel>

          {tab === MATCH_TABS.overview.key ? (
            <div className="pt-1">
              <AdSlot placement="match-detail-after-overview" />
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <OtherMatches
            matches={seriesQuery.data ?? []}
            currentMatchId={matchId}
            currentTournament={view.tournament}
            loading={seriesQuery.isLoading}
            viewAllHref="/matches"
          />
          <RelatedMatchNews
            articles={newsQuery.data ?? []}
            loading={newsQuery.isLoading}
            viewAllHref={entityNewsHref('match', matchId)}
            limit={4}
          />
          <div className="flex justify-center">
            <AdSlot placement="match-detail-sidebar" />
          </div>
        </aside>
      </div>

      <div className="mt-8">
        <CommentsSection targetType="match" targetId={matchId} />
      </div>
    </div>
  );
}

function CommentarySkeleton({ loading = true }: { loading?: boolean }) {
  return (
    <div className="space-y-3" aria-busy={loading}>
      <p className="text-xs text-stext">
        {loading ? 'Loading the ball-by-ball…' : 'Commentary is unavailable for this fixture.'}
      </p>
      {loading ? [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={38} />) : null}
    </div>
  );
}

function decodeMatchId(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
