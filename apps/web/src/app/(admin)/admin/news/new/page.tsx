import type { Metadata } from 'next';
import { Suspense } from 'react';
import NewsEditor from '../../../../../components/admin/NewsEditor';

export const metadata: Metadata = {
  title: 'New Article',
  robots: { index: false, follow: false },
};

export default function AdminNewArticlePage() {
  return <Suspense fallback={null}><NewsEditor mode="create" /></Suspense>;
}
