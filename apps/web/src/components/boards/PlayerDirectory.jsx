'use client';

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import PlayerCard from '../PlayerCard';
import FilterBar from '../FilterBar';
import EmptyState from '../EmptyState';
import { teams } from '../../data/teams';

const countries = ['Pakistan', 'England', 'Australia', 'West Indies', 'New Zealand', 'South Africa'];
const roles = ['Batter', 'Bowler', 'All-rounder', 'Wicketkeeper-Batter'];
const battingStyles = ['Right-hand Bat', 'Left-hand Bat'];
const bowlingStyles = [
  'Right-arm Fast', 'Left-arm Fast', 'Legbreak Googly', 'Legbreak',
  'Right-arm Offbreak', 'Right-arm Medium', 'Left-arm Orthodox', 'Left-arm Fast', '-',
];

export default function PlayerDirectory({ players }) {
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('');
  const [country, setCountry] = useState('');
  const [role, setRole] = useState('');
  const [batting, setBatting] = useState('');
  const [bowling, setBowling] = useState('');

  const teamOptions = useMemo(
    () => (teams || []).map((t) => ({ value: t.id, label: t.name })),
    []
  );

  const filters = [
    { key: 'team', label: 'Team', value: team, options: teamOptions },
    { key: 'country', label: 'Country', value: country, options: countries.map((c) => ({ value: c, label: c })) },
    { key: 'role', label: 'Role', value: role, options: roles.map((r) => ({ value: r, label: r })) },
    { key: 'batting', label: 'Batting', value: batting, options: battingStyles.map((s) => ({ value: s, label: s })) },
    { key: 'bowling', label: 'Bowling', value: bowling, options: bowlingStyles.map((s) => ({ value: s, label: s })) },
  ];

  const filtered = useMemo(() => {
    let list = players || [];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.teamName.toLowerCase().includes(q) ||
          p.country.toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q)
      );
    }
    if (team) list = list.filter((p) => p.teamId === team);
    if (country) list = list.filter((p) => p.country === country);
    if (role) list = list.filter((p) => p.role === role);
    if (batting) list = list.filter((p) => p.battingStyle === batting);
    if (bowling) list = list.filter((p) => p.bowlingStyle === bowling);
    return list;
  }, [players, search, team, country, role, batting, bowling]);

  const onFilterChange = (key, value) => {
    if (key === 'team') setTeam(value);
    if (key === 'country') setCountry(value);
    if (key === 'role') setRole(value);
    if (key === 'batting') setBatting(value);
    if (key === 'bowling') setBowling(value);
  };

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Users size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Player Directory
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Players</h1>
        <p className="mt-2 text-sm text-stext">
          Search and explore the stars of PSL 2026 — batters, bowlers and all-rounders from every franchise.
        </p>
      </header>

      <div className="mb-6 max-w-xl">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3.5 py-3 ring-1 ring-lborder focus-within:ring-accent/50">
          <Search size={17} className="shrink-0 text-stext" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players by name, team, country or role…"
            className="w-full bg-transparent text-sm text-mtext placeholder:text-stext focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-8">
        <FilterBar
          filters={filters}
          onChange={onFilterChange}
          onClear={() => {
            setTeam('');
            setCountry('');
            setRole('');
            setBatting('');
            setBowling('');
          }}
        />
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="mb-4 text-xs text-stext">
            Showing {filtered.length} player{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="fade-in grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="No players match your filters"
          message="Try adjusting your search or clearing some of the active filters."
        />
      )}
    </>
  );
}