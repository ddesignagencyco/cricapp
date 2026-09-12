import NewsDetailBody from '../../../components/boards/NewsDetailBody';
import { authorSlugFromArticle } from '../../../services/authors';
import { fetchMatchById } from '../../../services/matches';
import { fetchNews, fetchNewsById } from '../../../services/news';
import { fetchPlayerById } from '../../../services/players';
import { sharePageMetadata } from '../../../services/sharing';
import { fetchTeamById } from '../../../services/teams';
import { fetchTournamentById } from '../../../services/tournaments';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return sharePageMetadata({
    title: 'News',
    description: 'Cricket news and analysis from PAK CRICZONE.',
    path: `/news/${id}`,
  });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, allNews] = await Promise.all([
    fetchNewsById(id),
    fetchNews(),
  ]);
  if (!item) notFound();

  const playerIds = (item.playerIds as string[] | undefined) || [];
  const teamIds = (item.teamIds as string[] | undefined) || [];
  const matchIds = (item.matchIds as string[] | undefined) || [];
  const seriesIds = (item.seriesIds as string[] | undefined) || [];

  const [players, teams, matches, series] = await Promise.all([
    Promise.all(playerIds.slice(0, 8).map((playerId) => fetchPlayerById(playerId))),
    Promise.all(teamIds.slice(0, 8).map((teamId) => fetchTeamById(teamId))),
    Promise.all(matchIds.slice(0, 8).map((matchId) => fetchMatchById(matchId))),
    Promise.all(seriesIds.slice(0, 8).map((seriesId) => fetchTournamentById(seriesId))),
  ]);

  const relatedLinks = [
    ...players.filter(Boolean).map((player) => ({ href: `/players/${player!.id}`, label: player!.name })),
    ...teams.filter(Boolean).map((team) => ({ href: `/teams/${team!.id}`, label: team!.name })),
    ...matches.filter(Boolean).map((match) => {
      const matchId = String(match!.matchId || match!.id || '');
      const home = match!.teams?.home?.name || match!.teamNames?.[0] || 'Match';
      const away = match!.teams?.away?.name || match!.teamNames?.[1] || '';
      return { href: `/matches/${matchId}`, label: away ? `${home} vs ${away}` : home };
    }),
    ...series.filter(Boolean).map((item) => ({ href: `/tournaments/${item!.id}`, label: item!.name })),
  ];

  const authorSlug = authorSlugFromArticle(item);
  const related = allNews.filter((n) => n.id !== item.id).slice(0, 3);
  return (
    <NewsDetailBody
      item={item}
      related={related}
      authorHref={authorSlug ? `/authors/${authorSlug}` : undefined}
      relatedLinks={relatedLinks}
    />
  );
}
