import { redirect } from 'next/navigation';
import { decodeEntityId, encodeEntityId } from '../../utils/entityId';

export default async function CompareRedirect({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const params = await searchParams;
  const a = decodeEntityId(params.a);
  const b = decodeEntityId(params.b);
  const parts: string[] = [];
  if (a) parts.push(`a=${encodeEntityId(a)}`);
  if (b) parts.push(`b=${encodeEntityId(b)}`);
  redirect(parts.length ? `/teams?${parts.join('&')}` : '/teams');
}
