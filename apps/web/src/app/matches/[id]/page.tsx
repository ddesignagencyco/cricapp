import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MatchDetailBody from '../../../components/boards/MatchDetailBody';
import JsonLd from '../../json-ld';
import { fetchMatchById, fetchMatchTimeline } from '../../../services/matches';
import { fetchMatchOdds } from '../../../services/odds';
import { sharePageMetadata } from '../../../services/sharing';
import { buildMatchViewModel } from '../../../lib/matchViewModel';
import {
  buildFallOfWicketsIndex,
  slimTimelinePayload,
  timelineHasEvents,
} from '../../../lib/matchScorecardData';
import type { FallOfWicketEntry } from '../../../lib/matchScorecardData';
import type { MatchTimeline } from '../../../services/matches';

const SITE = 'https://pakcriczone.com';

/**
 * The match page's metadata, built from the match itself.
 *
 * The previous version shipped the same "Match" title and "Live cricket score,
 * scoreboard and timeline" description for every fixture, so every match page
 * competed with every other for the same query. Now the title names the two teams
 * and the competition, and the description states the real situation — a result, a
 * live score or a start time.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const matchId = decodeId(id);

  const [match, timeline] = await Promise.all([
    fetchMatchById(matchId).catch(() => null),
    fetchMatchTimeline(matchId).catch(() => null),
  ]);
  if (!match) {
    return sharePageMetadata({
      title: 'Match not found',
      description: 'This match could not be found.',
      path: `/matches/${encodeURIComponent(matchId)}`,
    });
  }

  const view = buildMatchViewModel({
    match: match as unknown as Record<string, unknown>,
    timeline: timeline?.payload ?? null,
  });

  const title = `${view.home.name} vs ${view.away.name}${
    view.matchNumber ? `, Match ${view.matchNumber}` : ''
  }`;

  const bits: string[] = [];
  if (view.statusLabel) bits.push(view.statusLabel);
  if (view.headline.home?.score) bits.push(`${view.home.name} ${view.headline.home.score}`);
  if (view.headline.away?.score) bits.push(`${view.away.name} ${view.headline.away.score}`);
  if (!bits.length && view.situation) bits.push(view.situation);

  const where = [view.venue, view.venueCity].filter(Boolean).join(', ');
  if (where) bits.push(where);
  if (view.tournament) bits.push(view.tournament);

  const description = bits.join(' · ');
  const path = `/matches/${encodeURIComponent(matchId)}`;

  return sharePageMetadata({
    title,
    description: description || 'Live cricket score, scorecard and commentary.',
    path,
    ogTitle: `${title} — ${view.statusLabel}`.trim(),
    ogDescription: description,
    ogType: 'article',
  });
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = decodeId(id);

  /**
   * The match, and only the part of its timeline the first paint needs.
   *
   * ## Why the ball events are not shipped
   *
   * A four-innings Test's timeline is 1,682 KB, of which **1,614 KB is 1,879 ball
   * events** — 96%. Sending that inside the document made the page a 2 MB download
   * before a reader had seen a single pixel, and it was then re-parsed four times on
   * the client (scorecard, squads, fall of wickets, event detection).
   *
   * The events are needed for exactly two things:
   *
   * - the **ball-by-ball commentary**, which is a tab — so it is fetched when that tab
   *   is opened and cached from then on;
   * - the **team score at each fall of wicket**, which is the only thing that cannot be
   *   derived from `statistics.innings[]`. That is walked **here**, once, and the
   *   resulting few kilobytes are passed down instead.
   *
   * Everything else the page reads — the competitor ids the innings are mapped by, the
   * period scores, the tournament, the venue and the whole per-player scorecard — is in
   * the remaining 67 KB, which is what the client now receives.
   */
  const [match, timeline, odds] = await Promise.all([
    fetchMatchById(matchId),
    fetchMatchTimeline(matchId).catch((): MatchTimeline | null => null),
    // 403 (region) and 404 (no snapshot) are both answers the Odds tab renders as an
    // empty state, so neither is allowed to fail the page.
    fetchMatchOdds(matchId).catch(() => null),
  ]);

  if (!match) return notFound();

  const payload = timeline?.payload ?? null;
  const view = buildMatchViewModel({
    match: match as unknown as Record<string, unknown>,
    timeline: payload,
  });

  // A Map does not survive serialisation, so it is flattened for the wire and rebuilt
  // on the client.
  const fallOfWickets = buildFallOfWicketsIndex(payload);
  const fallOfWicketsByInnings: Record<number, FallOfWicketEntry[]> =
    Object.fromEntries(fallOfWickets);
  const hasCommentary = timelineHasEvents(payload);

  return (
    <>
      <MatchStructuredData view={view} matchId={matchId} />
      <MatchDetailBody
        match={match}
        matchContext={slimTimelinePayload(payload)}
        fallOfWickets={fallOfWicketsByInnings}
        hasCommentary={hasCommentary}
        initialOdds={odds}
      />
    </>
  );
}

/**
 * Breadcrumb and SportsEvent structured data.
 *
 * Only fields the payload actually stated are emitted. A SportsEvent with an empty
 * `startDate`, a fabricated `location` or a `result` that is a guess is worse than no
 * structured data at all, so each block is assembled conditionally and dropped
 * entirely when it would be empty.
 */
function MatchStructuredData({
  view,
  matchId,
}: {
  view: ReturnType<typeof buildMatchViewModel>;
  matchId: string;
}) {
  const path = `/matches/${encodeURIComponent(matchId)}`;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Matches', item: `${SITE}/matches` },
      ...(view.tournament
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: view.tournament,
              item: view.tournamentId ? `${SITE}/tournaments/${encodeURIComponent(view.tournamentId)}` : undefined,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: view.tournament ? 4 : 3,
        name: `${view.home.name} vs ${view.away.name}`,
        item: `${SITE}${path}`,
      },
    ],
  };

  const competitors = [view.home, view.away]
    .filter((side) => side.name)
    .map((side) => ({
      '@type': 'SportsTeam',
      name: side.name,
      ...(side.id ? { '@id': side.id } : {}),
    }));

  const event: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${view.home.name} vs ${view.away.name}${view.matchNumber ? `, Match ${view.matchNumber}` : ''}`,
    url: `${SITE}${path}`,
    ...(competitors.length === 2
      ? { competitor: competitors, homeTeam: competitors[0], awayTeam: competitors[1] }
      : {}),
    ...(view.formatLabel ? { sport: 'Cricket' } : {}),
  };
  if (view.tournament) event.about = { '@type': 'Thing', name: view.tournament };
  if (view.scheduled) event.startDate = view.scheduled;
  if (view.venue) {
    event.location = {
      '@type': 'Place',
      name: [view.venue, view.venueCity, view.venueCountry].filter(Boolean).join(', '),
    };
  }
  if (view.statusLabel) event.eventStatus = view.statusLabel;
  if (view.result) event.description = view.result;
  if (view.winnerName) {
    event.winner = competitors.find((c) => c.name === view.winnerName) ?? { '@type': 'SportsTeam', name: view.winnerName };
  }

  return (
    <>
      <JsonLd data={breadcrumb} />
      <JsonLd data={event} />
    </>
  );
}

function decodeId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}
