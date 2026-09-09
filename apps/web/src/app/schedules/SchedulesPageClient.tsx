'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ScheduleBoard from '../../components/boards/ScheduleBoard';
import { fetchDailySchedule, fetchDailyResults } from '../../services/schedules';
import type { SportEventRecord } from '../../types/index';
import type { PageMeta } from '../../services/api/client';

const DEFAULT_META: PageMeta = { total: 0, page: 1, limit: 12, totalPages: 0 };

export default function SchedulesPageClient({ initialDate }: { initialDate: string }) {
  const searchParams = useSearchParams();
  const [date, setDate] = useState(initialDate);
  const [tab, setTab] = useState(() => searchParams.get('tab') || 'schedule');
  const [schedulePage, setSchedulePage] = useState(1);
  const [resultsPage, setResultsPage] = useState(1);

  const [schedule, setSchedule] = useState<SportEventRecord[]>([]);
  const [results, setResults] = useState<SportEventRecord[]>([]);
  const [scheduleMeta, setScheduleMeta] = useState<PageMeta>(DEFAULT_META);
  const [resultsMeta, setResultsMeta] = useState<PageMeta>(DEFAULT_META);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d !== date) {
      setDate(d);
      setSchedulePage(1);
      setResultsPage(1);
    }
    const t = searchParams.get('tab');
    if (t === 'schedule' || t === 'results') setTab(t);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const activePage = tab === 'schedule' ? schedulePage : resultsPage;

    Promise.all([
      fetchDailySchedule(date, schedulePage),
      fetchDailyResults(date, resultsPage),
    ])
      .then(([s, r]) => {
        if (cancelled) return;
        setSchedule(s.items);
        setScheduleMeta(s.meta);
        setResults(r.items);
        setResultsMeta(r.meta);
      })
      .catch(() => {
        if (cancelled) return;
        setSchedule([]);
        setResults([]);
        setScheduleMeta(DEFAULT_META);
        setResultsMeta(DEFAULT_META);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, schedulePage, resultsPage]);

  const handleDateChange = useCallback((next: string) => {
    setDate(next);
    setSchedulePage(1);
    setResultsPage(1);
    const url = new URL(window.location.href);
    url.searchParams.set('date', next);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleTabChange = useCallback((next: string) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const handleSchedulePageChange = useCallback((next: number) => {
    setSchedulePage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleResultsPageChange = useCallback((next: number) => {
    setResultsPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
      />
    </div>
  );
}
