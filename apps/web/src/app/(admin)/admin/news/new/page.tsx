import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EditorSkeleton } from '../../../../../components/skeletons/Skeletons';
import NewsEditor from '../../../../../components/admin/NewsEditor';

export const metadata: Metadata = {
  title: 'Create News',
  robots: { index: false, follow: false },
};

export default function AdminNewArticlePage() {
  return <Suspense fallback={<EditorSkeleton />}><NewsEditor mode="create" /></Suspense>;
}
