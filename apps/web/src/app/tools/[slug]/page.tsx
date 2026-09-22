import Link from 'next/link';
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-5 flex items-center gap-1.5 text-xs text-stext">
        <Link href="/tools" className="font-semibold hover:text-accent">Tools</Link>
        <span>/</span>
        <span className="truncate text-mtext">{tool.title}</span>
      </nav>
      <ToolCalculator tool={tool} />
    </div>
  );
}
