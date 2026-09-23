import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import ToolCalculator from '../../../components/tools/ToolCalculator';
import { toolBySlug } from '../../../lib/toolsCatalog';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  return {
    title: tool ? tool.title : 'Tool',
    description: tool?.blurb,
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-5">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          <ChevronLeft size={14} aria-hidden />
          All tools
        </Link>
      </nav>
      <ToolCalculator tool={tool} />
    </div>
  );
}
