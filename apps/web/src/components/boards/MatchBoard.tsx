'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import MatchCard from '../MatchCard';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import { fetchMatches } from '../../services/matches';

interface Props {
  initialMatches?: any[];
}

export default function MatchBoard({ initialMatches = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams.get('tab') || 'upcoming';
  const [team, setTeam] = useState('');
  
  const [displayMatches, setDisplayMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadMatches = async () => {
      setLoading(true);
      try {
        const limit = 12;
        const offset = page * limit;
        const data = await fetchMatches({ status: tab, limit, offset });
        if (mounted) {
          setDisplayMatches(data);
          setHasMore(data.length === limit);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadMatches();
    return () => { mounted = false; };
  }, [tab, page]);

  const filtered = useMemo(() => {
    let list = displayMatches || [];
    if (team) {
      list = list.filter((m) => (m.teams || []).some((c: string) => c.toLowerCase() === team.toLowerCase()));
    }
    return list;
  }, [displayMatches, team]);

  const tabs = useMemo(
    () => [
      { key: 'upcoming', label: 'Upcoming' },
      { key: 'live', label: 'Live' },
      { key: 'completed', label: 'Completed' },
      { key: 'cancelled', label: 'Cancelled' },
    ],
    []
  );

  const handleTabChange = (newTab: string) => {
    setPage(0);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
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
        <Tabs
          tabs={tabs}
          active={tab}
          onChange={handleTabChange}
        />
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <MatchCard key={m.matchId} match={m} />
            ))}
          </div>
          <div className="mt-10 flex items-center justify-center gap-6">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="group flex items-center gap-1.5 rounded-full border border-lborder bg-card px-5 py-2.5 text-sm font-semibold text-text shadow-sm transition-all hover:border-accent/40 hover:bg-elevated hover:text-accent disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
              Previous
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-stext">Page</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                {page + 1}
              </span>
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || loading}
              className="group flex items-center gap-1.5 rounded-full border border-lborder bg-card px-5 py-2.5 text-sm font-semibold text-text shadow-sm transition-all hover:border-accent/40 hover:bg-elevated hover:text-accent disabled:pointer-events-none disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </>
      ) : loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : (
        <EmptyState
          title={`No ${tab} matches found`}
          message="Try switching to a different status tab."
        />
      )}
    </>
  );
}
