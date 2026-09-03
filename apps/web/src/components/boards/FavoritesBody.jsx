'use client';

import Link from 'next/link';
import { Star, Users, Shield, Trash2 } from 'lucide-react';
import { useFavoritesStore } from '../../stores/favoritesStore.js';
import { teams, players, matches } from '../../services/cricketApi.js';
import PlayerCard from '../PlayerCard';
import MatchCard from '../MatchCard';
import EmptyState from '../EmptyState';

export default function FavoritesBody() {
  const favoriteTeamId = useFavoritesStore((s) => s.favoriteTeamId);
  const setFavoriteTeam = useFavoritesStore((s) => s.setFavoriteTeam);
  const favoritePlayerIds = useFavoritesStore((s) => s.favoritePlayerIds);
  const toggleFavoritePlayer = useFavoritesStore((s) => s.toggleFavoritePlayer);

  const favTeam = teams.find((t) => t.id === favoriteTeamId) || null;
  const favPlayers = players.filter((p) => favoritePlayerIds.includes(p.id));
  const favTeamMatches = matches
    .filter((m) => m.teams.home.teamId === favoriteTeamId || m.teams.away.teamId === favoriteTeamId)
    .slice(0, 4);

  const hasAny = favTeam || favPlayers.length > 0;

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-gold">
          <Star size={18} fill="currentColor" />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            My Cricket
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Favorites</h1>
        <p className="mt-2 text-sm text-stext">
          Your followed team, players and upcoming fixtures — all in one place.
        </p>
      </header>

      {!hasAny ? (
        <EmptyState
          title="No favorites yet"
          icon={Star}
          message="Star a team or player from their profile page to see them here."
        >
          <Link
            href="/teams"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent2"
          >
            <Shield size={14} /> Browse Teams
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {favTeam && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-mtext">
                  <Shield size={18} className="text-accent" /> Favorite Team
                </h2>
                <button
                  type="button"
                  onClick={() => setFavoriteTeam(null)}
                  className="flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-stext ring-1 ring-lborder transition-colors hover:text-red-400 hover:ring-red-400/30"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href={`/teams/${favTeam.id}`}
                  className="group flex items-center gap-4 rounded-2xl bg-card p-5 ring-1 ring-lborder transition-all hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
                >
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-elevated ring-1 ring-lborder">
                    {favTeam.logo ? (
                      <img src={favTeam.logo} alt={favTeam.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-accent">{favTeam.shortName}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-mtext group-hover:text-accent">{favTeam.name}</p>
                    <p className="text-xs text-stext">{favTeam.captain} • {favTeam.points} pts</p>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {favPlayers.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-mtext">
                  <Users size={18} className="text-accent" /> Favorite Players
                </h2>
                <span className="text-xs text-stext">{favPlayers.length} player{favPlayers.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {favPlayers.map((p) => (
                  <div key={p.id} className="relative">
                    <PlayerCard player={p} />
                    <button
                      type="button"
                      onClick={() => toggleFavoritePlayer(p.id)}
                      className="absolute right-2 top-2 z-10 rounded-lg bg-black/40 p-1.5 text-red-400 backdrop-blur-sm transition-colors hover:bg-black/60"
                      aria-label={`Remove ${p.name} from favorites`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {favTeamMatches.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
                Upcoming & Recent — {favTeam.name}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {favTeamMatches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
