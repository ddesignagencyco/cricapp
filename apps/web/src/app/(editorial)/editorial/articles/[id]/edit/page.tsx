'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import NewsEditor from '../../../../../../components/admin/NewsEditor';
import { EditorSkeleton } from '../../../../../../components/skeletons/Skeletons';

export default function EditorialEditArticlePage() {
  const params = useParams<{ id: string }>();
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NewsEditor mode="edit" id={params.id} scope="editorial" />
    </Suspense>
  );
}
