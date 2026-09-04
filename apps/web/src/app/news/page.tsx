import NewsBoard from '../../components/boards/NewsBoard';
import { fetchNews } from '../../services/news';

export const metadata = {
  title: 'News',
  description:
    'Match reports, PSL updates and analysis from the PAK CRICZONE newsroom.',
};

export default async function NewsPage() {
  const items = await fetchNews();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <NewsBoard items={items} />
    </div>
  );
}
