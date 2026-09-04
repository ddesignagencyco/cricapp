'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import MatchCard from '../MatchCard';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';

interface Props {
  matches: any[];
}

export default function MatchBoard({ matches }: Props) {
  const [tab, setTab] = useState('live');
  const [team, setTeam] = useState('');

  const tabs = useMemo(
    () => [
      { key: 'live', label: 'Live' },
      { key: 'upcoming', label: 'Upcoming' },
      { key: 'completed', label: 'Completed' },
    ],
    []
  );

  const allTeamOptions = useMemo(() => {
    const map = new Map();
    (matches || []).forEach((m) => {
      (m.teamNames || []).forEach((name: string, i: number) => {
        const code = m.teams?.[i];
        if (name && code) map.set(code.toLowerCase(), { value: code, label: name });
      });
    });
    return Array.from(map.values());
  }, [matches]);

  const filtered = useMemo(() => {
    let list = matches || [];
    list = list.filter((m) => m.status === tab);
    if (team) {
      list = list.filter((m) => (m.teams || []).some((c: string) => c.toLowerCase() === team.toLowerCase()));
    }
    return list;
  }, [matches, tab, team]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { live: 0, upcoming: 0, completed: 0 };
    (matches || []).forEach((m) => {
      c[m.status] = (c[m.status] || 0) + 1;
    });
    return c;
  }, [matches]);

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
          Browse live, upcoming and completed fixtures across PSL 2026 and international cricket.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <Tabs
          tabs={tabs.map((t) => ({ ...t, count: counts[t.key] || 0 }))}
          active={tab}
          onChange={setTab}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MatchCard key={m.matchId} match={m} />
          ))}
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
