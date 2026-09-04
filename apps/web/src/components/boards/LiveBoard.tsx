'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import MatchCard from '../MatchCard';
import SectionHeader from '../SectionHeader';
import EmptyState from '../EmptyState';

interface Props {
  matches: any[];
}

export default function LiveBoard({ matches }: Props) {
  const [showCompleted, setShowCompleted] = useState(true);

  const live = (matches || []).filter((m) => m.status === 'live');
  const completed = (matches || []).filter((m) => m.status === 'completed');
  const upcoming = (matches || []).filter((m) => m.status === 'upcoming');

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Zap size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Live Cricket Centre
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          Live Scores
        </h1>
        <p className="mt-2 text-sm text-stext">
          Live scores and run-rate data for every ongoing fixture.
        </p>
      </header>

      {live.length > 0 ? (
        <section className="fade-in mb-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {live.map((m) => (
              <MatchCard key={m.matchId} match={m} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          title="No live matches right now"
          message="Matches will appear here in real time as soon as they go live."
        />
      )}

      {upcoming.length > 0 && (
        <section className="mt-12">
          <SectionHeader title="Coming Up Next" subtitle="Fixtures" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.slice(0, 6).map((m) => (
              <MatchCard key={m.matchId} match={m} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="mt-12">
          <SectionHeader
            title="Recent Results"
            subtitle="Completed"
            actionLabel={showCompleted ? 'Hide' : 'Show'}
            onAction={() => setShowCompleted((s) => !s)}
          />
          {showCompleted && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completed.slice(0, 6).map((m) => (
                <MatchCard key={m.matchId} match={m} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
