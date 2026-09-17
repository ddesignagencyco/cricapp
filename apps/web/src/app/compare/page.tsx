import { redirect } from 'next/navigation';

export default async function CompareRedirect({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (params.a) next.set('a', params.a);
  if (params.b) next.set('b', params.b);
  const qs = next.toString();
  redirect(qs ? `/teams?${qs}` : '/teams');
}
