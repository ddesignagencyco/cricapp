import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import ToolCalculator from '../../../components/tools/ToolCalculator';
import { ToolPageHeader } from '../../../components/tools/ToolShared';
import EditorialSidebar from '../../../components/boards/EditorialSidebar';
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
    <div className="mx-auto max-w-site space-y-6 px-4 py-6 sm:px-6">
      <div className="space-y-4">
        <nav aria-label="Breadcrumb">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
          >
            <ChevronLeft size={14} aria-hidden />
            All tools
          </Link>
        </nav>
        <ToolPageHeader tool={tool} />
      </div>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <ToolCalculator tool={tool} />
        </div>
        <EditorialSidebar
          topPlacement="tools-sidebar"
        />
      </div>
    </div>
  );
}
