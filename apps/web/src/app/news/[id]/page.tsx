import NewsArticleRoute, { newsArticleMetadata } from '../../../components/boards/NewsArticleRoute';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return newsArticleMetadata(id);
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewsArticleRoute id={id} />;
}
