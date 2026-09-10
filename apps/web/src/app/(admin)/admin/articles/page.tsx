import type { Metadata } from 'next';
import NewsManager from '../../../../components/admin/NewsManager';

export const metadata: Metadata = {
  title: 'Articles',
  robots: { index: false, follow: false },
};

export default function AdminArticlesPage() {
  return <NewsManager />;
}
