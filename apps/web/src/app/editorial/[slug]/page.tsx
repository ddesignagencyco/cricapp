import EditorialDocument from '../../../components/EditorialDocument';
import EditorialLayout from '../../../components/EditorialLayout';
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
      <EditorialLayout title={page.title} slug={page.slug} updatedAt={page.updatedAt}>
        <EmptyState title={page.title} message="This page has no published content yet." />
      </EditorialLayout>
    );
  }
  return <EditorialDocument page={page} />;
}
