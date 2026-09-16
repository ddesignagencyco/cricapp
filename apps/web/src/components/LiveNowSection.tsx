'use client';

import { useEffect, useState } from 'react';
import type { Match } from '../types/index';
import { mergeLiveUpdate, useMatchStream } from '../hooks/useMatchStream';
import MatchCard from './MatchCard';
import SectionHeader from './SectionHeader';

export default function LiveNowSection({ matches }: { matches: Match[] }) {
  const [list, setList] = useState<Match[]>(matches);
  const liveUpdate = useMatchStream(undefined, true);

  useEffect(() => {
    setList(matches);
  }, [matches]);

  useEffect(() => {
    if (!liveUpdate) return;
    setList((prev) => mergeLiveUpdate(prev, liveUpdate));
  }, [liveUpdate]);

  const live = list.filter((match) => match.status === 'live');
  if (live.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 mt-8">
      <SectionHeader
        title="Live Now"
        subtitle={`${live.length} match${live.length === 1 ? '' : 'es'} in progress`}
        icon="zap"
        to="/matches?tab=live"
        actionLabel="All live"
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {live.slice(0, 3).map((m) => (
          <MatchCard key={m.matchId || m.id} match={m} />
        ))}
      </div>
    </section>
  );
}
