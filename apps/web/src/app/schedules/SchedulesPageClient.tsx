'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ScheduleBoard from '../../components/boards/ScheduleBoard';
import { fetchDailySchedule, fetchDailyResults } from '../../services/schedules';
import type { SportEventRecord } from '../../types/index';
import { ApiError, type PageMeta } from '../../services/api/client';

const RATE_LIMIT_MESSAGE =
  'Too many schedule requests were sent in a short time. Please wait a moment and try again.';
const GENERIC_MESSAGE = 'The schedule is temporarily unavailable.';

const DEFAULT_META: PageMeta = { total: 0, page: 1, limit: 12, totalPages: 0 };

export default function SchedulesPageClient({ initialDate }: { initialDate: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'schedule');
  const [schedulePage, setSchedulePage] = useState(1);
  const [resultsPage, setResultsPage] = useState(1);

  const [schedule, setSchedule] = useState<SportEventRecord[]>([]);
  const [results, setResults] = useState<SportEventRecord[]>([]);
  const [scheduleMeta, setScheduleMeta] = useState<PageMeta>(DEFAULT_META);
  const [resultsMeta, setResultsMeta] = useState<PageMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Mirror URL state without writing values that are already current, so that
  // stepping through dates cannot feed itself and re-trigger requests.
  useEffect(() => {
    const d = searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setDate((current) => (current === d ? current : d));
    }
    const t = searchParams.get('tab');
    if (t === 'schedule' || t === 'results') {
      setTab((current) => (current === t ? current : t));
    }
    const schedulePageParam = Math.max(1, Number(searchParams.get('schedulePage')) || 1);
    const resultsPageParam = Math.max(1, Number(searchParams.get('resultsPage')) || 1);
    setSchedulePage((current) => (current === schedulePageParam ? current : schedulePageParam));
    setResultsPage((current) => (current === resultsPageParam ? current : resultsPageParam));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    // Rapid day stepping would otherwise fire a request pair per click and hit
    // the API rate limit, so only the last requested day is fetched.
    const debounce = setTimeout(() => {
      const load = async () => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const [s, r] = await Promise.all([
              fetchDailySchedule(date, schedulePage),
              fetchDailyResults(date, resultsPage),
            ]);
            if (cancelled) return;
            setSchedule(s.items);
            setScheduleMeta(s.meta);
            setResults(r.items);
            setResultsMeta(r.meta);
            setErrorMessage(null);
            setLoading(false);
            return;
          } catch (error) {
            const rateLimited = error instanceof ApiError && error.status === 429;
            if (rateLimited && attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 1500));
              if (cancelled) return;
              continue;
            }
            if (cancelled) return;
            setSchedule([]);
            setResults([]);
            setScheduleMeta(DEFAULT_META);
            setResultsMeta(DEFAULT_META);
            setErrorMessage(rateLimited ? RATE_LIMIT_MESSAGE : GENERIC_MESSAGE);
            setLoading(false);
            return;
          }
        }
      };
      void load();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(debounce);
    };
  }, [date, retryKey, schedulePage, resultsPage]);

  const handleDateChange = useCallback((next: string) => {
    setDate(next);
    setSchedulePage(1);
    setResultsPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', next);
    params.delete('schedulePage');
    params.delete('resultsPage');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleTabChange = useCallback((next: string) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleSchedulePageChange = useCallback((next: number) => {
    setSchedulePage(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('schedulePage');
    else params.set('schedulePage', String(next));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, router, searchParams]);

  const handleResultsPageChange = useCallback((next: number) => {
    setResultsPage(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('resultsPage');
    else params.set('resultsPage', String(next));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, router, searchParams]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ScheduleBoard
        date={date}
        schedule={schedule}
        results={results}
        scheduleMeta={scheduleMeta}
        resultsMeta={resultsMeta}
        tab={tab}
        onDateChange={handleDateChange}
        onTabChange={handleTabChange}
        onSchedulePageChange={handleSchedulePageChange}
        onResultsPageChange={handleResultsPageChange}
        loading={loading}
        errorMessage={errorMessage}
        onRetry={() => setRetryKey((key) => key + 1)}
      />
    </div>
  );
}
