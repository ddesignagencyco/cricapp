import StoriesBoard from '../../components/stories/StoriesBoard';
import { fetchStories } from '../../services/stories';
import { sharePageMetadata } from '../../services/sharing';

export const revalidate = 60;

const PAGE_SIZE = 20;

export const metadata = sharePageMetadata({
  title: 'Stories',
  description:
    'Short-form cricket clips and moments from PAK CRICZONE — quick hits, highlights and reactions.',
  path: '/stories',
});

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const result = await fetchStories({ page, limit: PAGE_SIZE }).then(
    (value) => ({ value, loadError: false as const }),
    // A dead API must not take the page down; the board says so instead of
    // claiming there are no stories.
    () => ({ value: { items: [], total: 0, totalPages: 1 }, loadError: true as const })
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">Watch</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext">Stories</h1>
        <p className="mt-1 max-w-2xl text-sm text-stext">
          Short-form clips and moments from the cricket world.
        </p>
      </header>

      <StoriesBoard
        items={result.value.items}
        page={page}
        totalPages={result.value.totalPages}
        loadError={result.loadError}
      />
    </div>
  );
}
