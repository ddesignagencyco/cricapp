import { redirect } from 'next/navigation';
import NewsBoard from '../../components/boards/NewsBoard';
import { fetchNewsCategories, fetchNewsPage } from '../../services/news';
import { newsListPath } from '../../utils/newsConstraints';

export const metadata = {
  title: 'News',
  description:
    'Match reports, PSL updates and analysis from the PAK CRICZONE newsroom.',
};

const PAGE_SIZE = 12;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; tag?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const category = params.category?.trim() || undefined;
  const tag = params.tag?.trim() || undefined;
  if (params.lang === 'ur') {
    redirect(newsListPath('ur', { category, tag, page }));
  }
  const language = 'en';
  const [newsResult, categories] = await Promise.all([
    fetchNewsPage({ page, limit: PAGE_SIZE, category, tag, language })
      .then((result) => ({ result, loadError: false as const }))
      .catch(() => ({ result: { items: [], total: 0, totalPages: 1 }, loadError: true as const })),
    fetchNewsCategories().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <NewsBoard
        items={newsResult.result.items}
        categories={categories}
        page={page}
        total={newsResult.result.total}
        totalPages={newsResult.result.totalPages}
        limit={PAGE_SIZE}
        selectedCategory={category || 'all'}
        language={language}
        loadError={newsResult.loadError}
      />
    </div>
  );
}
