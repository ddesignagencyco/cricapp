'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ScheduleBoard from '../../components/boards/ScheduleBoard';
import { fetchDailySchedule, fetchDailyResults } from '../../services/schedules';

export default function SchedulesPageClient({ initialDate }: { initialDate: string }) {
  const searchParams = useSearchParams();
  const [date, setDate] = useState(initialDate);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const d = searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setDate(d);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchDailySchedule(date), fetchDailyResults(date)])
      .then(([s, r]) => {
        if (cancelled) return;
        setSchedule(s || []);
        setResults(r || []);
      })
      .catch(() => {
        if (cancelled) return;
        setSchedule([]);
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const handleDateChange = useCallback((next: string) => {
    setDate(next);
    const url = new URL(window.location.href);
    url.searchParams.set('date', next);
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {loading ? (
        <ScheduleBoard date={date} schedule={[]} results={[]} onDateChange={handleDateChange} />
      ) : (
        <ScheduleBoard date={date} schedule={schedule} results={results} onDateChange={handleDateChange} />
      )}
    </div>
  );
}
