import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import EmptyState from '../../../../../components/EmptyState';
import PaginationLinks from '../../../../../components/PaginationLinks';
import { RelatedNewsPanel } from '../../../../../components/boards/RelatedNewsPanel';
import { fetchNewsPage } from '../../../../../services/news';
import { isNewsEntityType, type NewsEntityType } from '../../../../../components/EntityLinks';
import type { NewsArticle } from '../../../../../types';

/**
 * Every story about one thing: a match, a team, a player or a series.
 *
 * Entity pages used to list all of their linked stories inline, which made a match page
 * longer than the match. They now show a handful and link here, so the full list lives on
 * a page of its own that can be paginated, shared and indexed.
 *
 * `type` is the same vocabulary the news API already filters on, so this page passes the
 * pair straight through rather than reinterpreting it.
 */

const PAGE_SIZE = 12;

/** What the four kinds are called in a heading. */
const TYPE_LABEL: Record<NewsEntityType, string> = {
  match: 'Match',
  team: 'Team',
  player: 'Player',
  series: 'Series',
};

const TYPE_NOUN: Record<NewsEntityType, string> = {
  match: 'this match',
  team: 'this team',
  player: 'this player',
  series: 'this series',
};

/** Where the reader can go back to, and what the page is about. */
function backRoute(type: NewsEntityType, id: string): string {
  if (type === 'match') return `/matches/${id}`;
  if (type === 'team') return `/teams/${id}`;
  if (type === 'player') return `/players/${id}`;
  return `/tournaments/${id}`;
}
function filterFor(type: NewsEntityType, id: string) {
  return type === 'match'
    ? { matchId: id }
    : type === 'team'
      ? { teamId: id }
      : type === 'player'
        ? { playerId: id }
        : { seriesId: id };
}

function titleFor(articles: NewsArticle[], type: NewsEntityType): string {
  // The entity's own name is not on this endpoint's filter, so the page is titled by what
  // it is rather than invented from a story. Nothing is guessed.
  return `News about ${TYPE_NOUN[type]}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!isNewsEntityType(type)) return { title: 'News' };
  const label = TYPE_LABEL[type];
  return {
    title: `${label} news`,
    description: `All ${label.toLowerCase()} stories from the PAK CRICZONE newsroom, newest first.`,
  };
}

export default async function EntityNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { type, id } = await params;
  if (!isNewsEntityType(type)) notFound();

  const entityId = decodeURIComponent(id);
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);

  const result = await fetchNewsPage({ ...filterFor(type, entityId), page, limit: PAGE_SIZE })
    .then((value) => ({ value, loadError: false as const }))
    .catch(() => ({
      value: { items: [] as NewsArticle[], total: 0, totalPages: 1 },
      loadError: true as const,
    }));

  const { items, total, totalPages } = result.value;
  if (page > 1 && items.length === 0) redirect(`/news/by/${type}/${id}`);

  const heading = titleFor(items, type);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <Link
          href={backRoute(type, entityId)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stext transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to {TYPE_NOUN[type]}
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-mtext sm:text-3xl">{heading}</h1>
          <p className="mt-1 text-sm text-stext">
            {total > 0
              ? `${total} ${total === 1 ? 'story' : 'stories'}, newest first`
              : 'No stories linked to this yet'}
          </p>
        </div>
      </div>

      {result.loadError ? (
        <EmptyState
          title="News could not be loaded"
          message="Something went wrong on our side. Please try again in a moment."
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No stories yet"
          message="Nothing has been linked to this yet. Stories appear here as soon as the newsroom links them."
        />
      ) : (
        <>
          <RelatedNewsPanel
            articles={items}
            emptyTitle="No stories yet"
            emptyHint="Stories appear here as soon as the newsroom links them."
          />
          <PaginationLinks
            page={page}
            totalPages={totalPages}
            label={`${TYPE_LABEL[type]} news`}
            hrefFor={(target) =>
              target === 1 ? `/news/by/${type}/${id}` : `/news/by/${type}/${id}?page=${target}`
            }
          />
        </>
      )}

      <p className="border-t border-lborder pt-4 text-xs text-stext">
        Looking for everything?{' '}
        <Link href="/news" className="font-semibold text-accent hover:underline">
          Browse all news
        </Link>
        .
      </p>
    </div>
  );
}
