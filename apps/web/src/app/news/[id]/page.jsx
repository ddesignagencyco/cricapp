import NewsDetailBody from '../../../components/boards/NewsDetailBody.jsx';
import { fetchNews, fetchNewsById, news } from '../../../services/cricketApi.js';

export function generateStaticParams() {
  return news.map((n) => ({ id: n.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const item = await fetchNewsById(id);
  if (!item) {
    return { title: 'Article not found' };
  }
  return {
    title: item.title,
    description: item.excerpt,
  };
}

export default async function NewsDetailPage({ params }) {
  const { id } = await params;
  const [item, allNews] = await Promise.all([
    fetchNewsById(id),
    fetchNews(),
  ]);
  const related = item
    ? allNews.filter((n) => n.id !== item.id).slice(0, 3)
    : [];
  return <NewsDetailBody item={item} related={related} />;
}
