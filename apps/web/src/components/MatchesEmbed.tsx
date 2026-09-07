'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Radio } from 'lucide-react';
import EmptyState from './EmptyState';
import MatchCard from './MatchCard';
import { fetchMatches, fetchLiveMatches } from '../services/matches';

const EMBED_TABS = [
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

interface Props {
  tournament?: string;
  limit?: number;
  title?: string;
}

export default function MatchesEmbed({ tournament, limit = 6, title = 'Live, Upcoming & Completed' }: Props) {
  const [tab, setTab] = useState('live');
  const [live, setLive] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [liveRes, upRes, compRes] = await Promise.all([
        fetchLiveMatches(),
        fetchMatches({ status: 'upcoming' }),
        fetchMatches({ status: 'completed' }),
      ]);
      if (!active) return;
      setLive((liveRes || []).slice(0, limit));
      setUpcoming((upRes || []).slice(0, limit));
      setCompleted((compRes || []).slice(0, limit));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [limit]);

  const list = tab === 'live' ? live : tab === 'upcoming' ? upcoming : completed;
  const counts = useMemo(
    () => ({ live: live.length, upcoming: upcoming.length, completed: completed.length }),
    [live, upcoming, completed]
  );
  const titleText = tournament ? `${title} · ${tournament}` : title;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-accent2" />
          <h2 className="text-lg font-bold text-mtext">{titleText}</h2>
        </div>
        <Link href="/matches" className="text-xs font-bold text-accent hover:underline">
          View all matches →
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {EMBED_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                : 'bg-card text-stext ring-1 ring-lborder hover:text-mtext'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-[10px] opacity-70">({counts[t.key as keyof typeof counts]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-sm bg-card ring-1 ring-lborder" />
          ))}
        </div>
      ) : list.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => (
            <MatchCard key={m.matchId} match={m} compact />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No matches here yet"
          message="Matches will appear as soon as the data syncs."
        />
      )}
    </div>
  );
}