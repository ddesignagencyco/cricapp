import EditorialDocument from '../../../components/EditorialDocument';
import EmptyState from '../../../components/EmptyState';
import { fetchEditorialPage } from '../../../services/editorial';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetchEditorialPage(slug).catch(() => null);
  return {
    title: page?.title || 'Editorial',
    description: page?.title || 'Editorial policy from PAK CRICZONE.',
  };
}

export default async function EditorialSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetchEditorialPage(slug).catch(() => null);
  if (!page) notFound();
  if (!page.content?.trim()) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <EmptyState title={page.title} message="This page has no published content yet." />
      </div>
    );
  }
  return <EditorialDocument page={page} />;
}
