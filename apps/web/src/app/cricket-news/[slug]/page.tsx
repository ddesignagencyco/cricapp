import NewsArticleRoute, { newsArticleMetadata } from '../../../components/boards/NewsArticleRoute';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return newsArticleMetadata(slug);
}

export default async function CricketNewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NewsArticleRoute id={slug} />;
}
