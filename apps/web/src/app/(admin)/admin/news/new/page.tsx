import type { Metadata } from 'next';
import NewsEditor from '../../../../../components/admin/NewsEditor';

export const metadata: Metadata = {
  title: 'New Article',
  robots: { index: false, follow: false },
};

export default function AdminNewArticlePage() {
  return <NewsEditor mode="create" />;
}
