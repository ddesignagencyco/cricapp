import type { Metadata } from 'next';
import NewsManager from '../../../../components/admin/NewsManager';

export const metadata: Metadata = {
  title: 'Manage News',
  robots: { index: false, follow: false },
};

export default function AdminNewsPage() {
  return <NewsManager />;
}
