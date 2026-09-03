'use client';

import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import MatchCard from '../MatchCard';
import Tabs from '../Tabs';
import FilterBar from '../FilterBar';
import EmptyState from '../EmptyState';
import { teams } from '../../data/teams';

const teamFilterOpts = teams
  .map((t) => ({ value: t.id, label: t.name }))
  .filter((o) => o.label);

export default function MatchBoard({ matches }) {
  const [tab, setTab] = useState('live');
  const [tournament, setTournament] = useState('');
  const [team, setTeam] = useState('');

  const tabs = useMemo(
    () => [
      { key: 'live', label: 'Live' },
      { key: 'upcoming', label: 'Upcoming' },
      { key: 'completed', label: 'Completed' },
    ],
    []
  );

  const filters = [
    {
      key: 'tournament',
      label: 'Tournament',
      value: tournament,
      options: [
        { value: 't1', label: 'PSL 2026' },
        { value: 't2', label: 'International T20' },
        { value: 't3', label: 'ODI Qualifiers' },
      ],
    },
    { key: 'team', label: 'Team', value: team, options: teamFilterOpts },
  ];

  const filtered = useMemo(() => {
    let list = matches || [];
    list = list.filter((m) => m.status === tab);
    if (tournament) list = list.filter((m) => m.tournamentId === tournament);
    if (team) {
      list = list.filter(
        (m) => m.teams.home.teamId === team || m.teams.away.teamId === team
      );
    }
    return list;
  }, [matches, tab, tournament, team]);

  const onFilterChange = (key, value) => {
    if (key === 'tournament') setTournament(value);
    if (key === 'team') setTeam(value);
  };

  const counts = useMemo(() => {
    const c = { live: 0, upcoming: 0, completed: 0 };
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

      <div className="mb-8">
        <FilterBar
          filters={filters}
          onChange={onFilterChange}
          onClear={() => {
            setTournament('');
            setTeam('');
          }}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${tab} matches found`}
          message="Try adjusting your filters or switching to a different status tab."
        />
      )}
    </>
  );
}