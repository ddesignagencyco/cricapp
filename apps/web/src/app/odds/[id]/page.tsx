import { notFound } from 'next/navigation';
import MatchOddsView from '../../../components/odds/MatchOddsView';
import { normalizeOddsMatchId, oddsPageHref } from '../../../lib/oddsPaths';
import { matchSides } from '../../../lib/predictions';
import { fetchMatchById } from '../../../services/matches';
import { marketDisplayName } from '../../../lib/oddsMarketRules';
import { fetchMatchOdds } from '../../../services/odds';
import { sharePageMetadata } from '../../../services/sharing';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = normalizeOddsMatchId(id);
  const oddsResult = await fetchMatchOdds(matchId).catch(() => null);
  const market =
    oddsResult?.status === 'ok'
      ? oddsResult.data.markets.find((m) => m.marketKey === 'match_winner') ?? oddsResult.data.markets[0]
      : null;
  const marketName = market ? marketDisplayName(market.name) : 'Match winner (incl. super over)';
  return sharePageMetadata({
    title: `${marketName} — odds comparison`,
    description: 'Licensed price comparison with source timestamps and market settlement rules.',
    path: oddsPageHref(matchId),
  });
}

export default async function MatchOddsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = normalizeOddsMatchId(id);
  const [match, oddsResult] = await Promise.all([
    fetchMatchById(matchId),
    fetchMatchOdds(matchId).catch(() => ({ status: 'not_found' as const })),
  ]);

  if (oddsResult.status === 'not_found' && !match) {
    return notFound();
  }

  const sides = match ? matchSides(match) : { homeName: 'Home', awayName: 'Away' };
  const pollLive = match?.status === 'live';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {match ? (
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-stext">Odds intelligence</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-mtext sm:text-3xl">
            {sides.homeName} vs {sides.awayName}
          </h1>
        </header>
      ) : null}
      <MatchOddsView
        matchId={matchId}
        homeLabel={sides.homeName}
        awayLabel={sides.awayName}
        initial={oddsResult.status === 'ok' ? oddsResult.data : null}
        initialForbidden={oddsResult.status === 'forbidden'}
        pollLive={pollLive}
      />
    </div>
  );
}
