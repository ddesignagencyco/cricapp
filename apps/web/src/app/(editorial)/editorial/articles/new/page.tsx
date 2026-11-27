'use client';

import { Suspense } from 'react';
import NewsEditor from '../../../../../components/admin/NewsEditor';
import { EditorSkeleton } from '../../../../../components/skeletons/Skeletons';

export default function EditorialNewArticlePage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NewsEditor mode="create" scope="editorial" />
    </Suspense>
  );
}
