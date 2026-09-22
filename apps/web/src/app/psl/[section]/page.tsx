import { notFound, redirect } from 'next/navigation';

const SECTIONS = ['table', 'stats', 'squads', 'fixtures', 'news'] as const;

export default async function PslSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { section } = await params;
  const { season } = await searchParams;
  if (!SECTIONS.includes(section as (typeof SECTIONS)[number])) notFound();
  const query = season ? `?season=${encodeURIComponent(season)}` : '';
  redirect(`/psl${query}#${section}`);
}
