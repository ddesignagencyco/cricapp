'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Pagination from '../Pagination';

interface Props {
  page: number;
  total: number;
  limit: number;
}

export default function PredictionsUpcomingPager({ page, total, limit }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));

  if (total <= 0) return null;

  const handlePageChange = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      total={total}
      limit={limit}
      onPageChange={handlePageChange}
    />
  );
}
