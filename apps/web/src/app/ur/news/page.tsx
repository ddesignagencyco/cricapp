import NewsBoard from '../../../components/boards/NewsBoard';
import { fetchNewsCategories, fetchNewsPage } from '../../../services/news';

export const metadata = {
  title: 'اردو خبریں',
  description: 'میچ رپورٹس اور پی ایس ایل کی اردو خبریں۔',
};

const PAGE_SIZE = 12;

export default async function UrduNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const category = params.category?.trim() || undefined;
  const tag = params.tag?.trim() || undefined;
  const [newsResult, categories] = await Promise.all([
    fetchNewsPage({ page, limit: PAGE_SIZE, category, tag, language: 'ur' })
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
        language="ur"
        loadError={newsResult.loadError}
      />
    </div>
  );
}
