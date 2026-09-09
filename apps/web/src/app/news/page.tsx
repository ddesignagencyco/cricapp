import NewsBoard from '../../components/boards/NewsBoard';
import { fetchNews, fetchNewsCategories } from '../../services/news';

export const metadata = {
  title: 'News',
  description:
    'Match reports, PSL updates and analysis from the PAK CRICZONE newsroom.',
};

export default async function NewsPage() {
  const [items, categories] = await Promise.all([
    fetchNews({ limit: 60 }),
    fetchNewsCategories().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <NewsBoard items={items} categories={categories} />
    </div>
  );
}
