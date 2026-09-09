'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, Loader2 } from 'lucide-react';
import type { Match } from '../../types/index';
import { fetchMatchesPage } from '../../services/matches';
import MatchCard from '../MatchCard';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';

const LIMIT = 20;

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function MatchBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams.get('tab') || 'upcoming';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMatchesPage({ status: tab, limit: LIMIT, page })
      .then(({ items, total: t }) => {
        if (!cancelled) {
          setMatches(items);
          setTotal(t);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMatches([]);
          setTotal(0);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tab, page]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LIMIT));

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(p));
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <CalendarDays size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Fixtures & Results
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Matches</h1>
        <p className="mt-2 text-sm text-stext">
          Browse live, upcoming, and completed matches across domestic and international cricket.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <Tabs tabs={TABS} active={tab} onChange={handleTabChange} />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : matches.length > 0 ? (
        <>
          <p className="mb-4 text-xs text-stext">
            Showing {matches.length} of {total} match{total === 1 ? '' : 'es'}
          </p>
          <div className="fade-in grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.matchId || m.id} match={m} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      ) : (
        <EmptyState
          title={`No ${tab} matches found`}
          message="Try switching to a different status tab."
        />
      )}
    </>
  );
}
