import NewsBoard from '../../components/boards/NewsBoard';
import { fetchNewsCategories, fetchNewsPage } from '../../services/news';

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
  const language = params.lang === 'ur' ? 'ur' : 'en';
  const [result, categories] = await Promise.all([
    fetchNewsPage({ page, limit: PAGE_SIZE, category, tag, language }),
    fetchNewsCategories().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <NewsBoard
        items={result.items}
        categories={categories}
        page={page}
        total={result.total}
        totalPages={result.totalPages}
        limit={PAGE_SIZE}
        selectedCategory={category || 'all'}
        language={language}
      />
    </div>
  );
}
