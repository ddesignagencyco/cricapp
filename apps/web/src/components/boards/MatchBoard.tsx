'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Editorial Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-br from-card via-card to-elevated p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">
              <CalendarDays size={13} />
              <span>Fixtures & Results</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-mtext sm:text-4xl">
              Cricket Matches
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stext sm:text-base">
              Explore live ball-by-ball scorecards, upcoming international and league fixtures, and verified past results.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-lborder bg-secondary/80 px-4 py-2.5 backdrop-blur-md">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs">
                <span className="font-black text-mtext">{total}</span>{' '}
                <span className="text-stext capitalize">{tab} Matches</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-lborder/80 pb-4">
        <Tabs tabs={TABS} active={tab} onChange={handleTabChange} />

        <div className="text-xs font-semibold text-stext">
          <span>Page {page} of {totalPages}</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-3xl border border-lborder bg-card p-5"
            />
          ))}
        </div>
      ) : matches.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.matchId || m.id} match={m} />
            ))}
          </div>
          <div className="pt-6">
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </>
      ) : (
        <EmptyState
          title={`No ${tab} matches found`}
          message="Try switching to a different status tab or check back later for scheduled fixtures."
        />
      )}
    </div>
  );
}
