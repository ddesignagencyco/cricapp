import { redirect } from 'next/navigation';

export const metadata = {
  title: 'اردو خبریں',
  description: 'میچ رپورٹس اور پی ایس ایل کی اردو خبریں۔',
};

export default async function UrduNewsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  next.set('lang', 'ur');
  if (params.page) next.set('page', params.page);
  if (params.category) next.set('category', params.category);
  if (params.tag) next.set('tag', params.tag);
  redirect(`/news?${next.toString()}`);
}
