import NewsDetailBody from '../../../components/boards/NewsDetailBody';
import { fetchNews, fetchNewsById } from '../../../services/news';
import { sharePageMetadata } from '../../../services/sharing';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await fetchNewsById(id);
  if (!item) {
    return { title: 'Article not found' };
  }
  return sharePageMetadata({
    title: item.title,
    description: item.excerpt,
    image: item.image,
    path: `/news/${item.slug || id}`,
  });
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, allNews] = await Promise.all([
    fetchNewsById(id),
    fetchNews(),
  ]);
  if (!item) notFound();
  const related = allNews.filter((n) => n.id !== item.id).slice(0, 3);
  return <NewsDetailBody item={item} related={related} />;
}
