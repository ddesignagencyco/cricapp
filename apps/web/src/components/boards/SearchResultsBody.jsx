'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Users, Shield, Calendar, Trophy, Loader2 } from 'lucide-react';
import { searchAll } from '../../services/cricketApi.js';
import TeamLogo from '../TeamLogo';
import EmptyState from '../EmptyState';

const SectionIcon = ({ type }) => {
  const cls = 'text-accent';
  if (type === 'players') return <Users size={16} className={cls} />;
  if (type === 'teams') return <Shield size={16} className={cls} />;
  if (type === 'matches') return <Calendar size={16} className={cls} />;
  return <Trophy size={16} className={cls} />;
};

export default function SearchResultsBody() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchAll(q).then((res) => {
      setResults(res);
      setLoading(false);
    });
  }, [q]);

  const groups = results
    ? [
        { key: 'players', label: 'Players', items: results.players, to: (r) => `/players/${r.id}`, render: (r) => ({ title: r.name, sub: `${r.teamName} • ${r.role}` }) },
        { key: 'teams', label: 'Teams', items: results.teams, to: (r) => `/teams/${r.id}`, render: (r) => ({ title: r.name, sub: `${r.shortName} • ${r.city}` }) },
        { key: 'matches', label: 'Matches', items: results.matches, to: (r) => `/matches/${r.id}`, render: (r) => ({ title: `${r.teams.home.code} vs ${r.teams.away.code}`, sub: `${r.tournamentName} • ${r.status}` }) },
        { key: 'tournaments', label: 'Tournaments', items: results.tournaments, to: () => '/psl', render: (r) => ({ title: r.name, sub: `${r.shortName} • ${r.format}` }) },
      ].filter((g) => g.items.length > 0)
    : [];

  const totalResults = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Search size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">Search</span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
          {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Search'}
        </h1>
        {results && (
          <p className="mt-2 text-sm text-stext">
            {totalResults} result{totalResults !== 1 ? 's' : ''} found
          </p>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-accent" />
        </div>
      )}

      {!loading && !q && (
        <EmptyState
          title="Start searching"
          icon={Search}
          message="Type a player name, team, match or tournament to find results."
        />
      )}

      {!loading && q && groups.length === 0 && (
        <EmptyState
          title="No results found"
          icon={Search}
          message={`We couldn't find anything matching "${q}". Try a different search term.`}
        />
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-10">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
                <SectionIcon type={group.key} /> {group.label}
                <span className="ml-2 rounded-full bg-elevated px-2.5 py-0.5 text-xs font-semibold text-stext">
                  {group.items.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const { title, sub } = group.render(item);
                  return (
                    <Link
                      key={item.id}
                      href={group.to(item)}
                      className="group flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-lborder transition-all hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
                    >
                      {group.key === 'teams' ? (
                        <TeamLogo teamId={item.id} size="sm" />
                      ) : group.key === 'players' ? (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-elevated text-xs font-bold text-accent ring-1 ring-lborder">
                          {item.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                        </div>
                      ) : (
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-elevated text-accent ring-1 ring-lborder">
                          <SectionIcon type={group.key} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-mtext group-hover:text-accent">{title}</p>
                        <p className="truncate text-xs text-stext">{sub}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
