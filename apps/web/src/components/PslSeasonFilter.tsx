'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { PslSeason } from '../types/index';

interface Props {
  seasons: PslSeason[];
  activeSeasonId: string;
}

export default function PslSeasonFilter({ seasons, activeSeasonId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (seasons.length <= 1) return null;

  const setSeason = (id: string) => {
    if (id === activeSeasonId) return;
    const currentQuery = typeof window !== 'undefined' ? window.location.search : searchParams.toString();
    const params = new URLSearchParams(currentQuery);
    params.delete('season');
    if (id) {
      params.set('season', id);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {seasons.map((s) => {
        const active = s.id === activeSeasonId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setSeason(s.id)}
            disabled={active}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${active
                ? 'bg-accent text-white shadow-md shadow-accent/25 cursor-default'
                : 'bg-card text-stext ring-1 ring-lborder hover:bg-elevated hover:text-mtext'
              }`}
          >
            {s.name || s.year || s.id}
          </button>
        );
      })}
    </div>
  );
}
