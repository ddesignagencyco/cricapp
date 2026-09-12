import type { Metadata } from 'next';
import { Suspense } from 'react';
import NewsEditor from '../../../../../../components/admin/NewsEditor';

export const metadata: Metadata = {
  title: 'Edit Article',
  robots: { index: false, follow: false },
};

export default async function AdminEditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Suspense fallback={null}><NewsEditor mode="edit" id={id} /></Suspense>;
}
