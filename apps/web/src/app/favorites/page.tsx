'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Heart,
  Loader2,
  MapPin,
  Shield,
  Trash2,
  UserRound,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listFavorites, removeFavorite, type FavoriteItem } from '../../services/favorites';
import { fetchTeamById } from '../../services/teams';
import { fetchPlayerById } from '../../services/players';
import { fetchMatchById } from '../../services/matches';
import { useAuth } from '../../components/AuthProvider';
import TeamLogo from '../../components/TeamLogo';
import Badge from '../../components/Badge';
import { formatScheduled, getInitials } from '../../utils/helpers';
import { ConfirmDialog } from '../../components/admin/AdminShared';
import type { Team, Player, Match } from '../../types/index';

interface EnrichedFavorite {
  item: FavoriteItem;
  team?: Team | null;
  player?: Player | null;
  match?: Match | null;
  loading: boolean;
}

export default function FavoritesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [enrichedMap, setEnrichedMap] = useState<Record<string, EnrichedFavorite>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'team' | 'player' | 'match'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    listFavorites()
      .then((items) => {
        setFavorites(items);
        // Initialize map
        const initial: Record<string, EnrichedFavorite> = {};
        for (const item of items) {
          initial[item.id] = { item, loading: true };
        }
        setEnrichedMap(initial);

        // Fetch detail for each item concurrently
        items.forEach((item) => {
          if (item.targetType === 'team') {
            fetchTeamById(item.targetId)
              .then((team) => {
                setEnrichedMap((prev) => ({
                  ...prev,
                  [item.id]: { item, team, loading: false },
                }));
              })
              .catch(() => {
                setEnrichedMap((prev) => ({
                  ...prev,
                  [item.id]: { item, team: null, loading: false },
                }));
              });
          } else if (item.targetType === 'player') {
            fetchPlayerById(item.targetId)
              .then((player) => {
                setEnrichedMap((prev) => ({
                  ...prev,
                  [item.id]: { item, player, loading: false },
                }));
              })
              .catch(() => {
                setEnrichedMap((prev) => ({
                  ...prev,
                  [item.id]: { item, player: null, loading: false },
                }));
              });
          } else if (item.targetType === 'match') {
            fetchMatchById(item.targetId)
              .then((match) => {
                setEnrichedMap((prev) => ({
                  ...prev,
                  [item.id]: { item, match, loading: false },
                }));
              })
              .catch(() => {
                setEnrichedMap((prev) => ({
                  ...prev,
                  [item.id]: { item, match: null, loading: false },
                }));
              });
          }
        });
      })
      .catch(() => {
        // Silently handle load errors; do not spam toasts
        setFavorites([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const remove = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await removeFavorite(deleteTarget.id);
      setFavorites((list) => list.filter((f) => f.id !== deleteTarget.id));
      setEnrichedMap((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      toast.success(`Removed "${deleteTarget.name}" from favorites.`);
    } catch {
      toast.error('Could not remove from favorites.');
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return favorites;
    return favorites.filter((f) => f.targetType === activeTab);
  }, [favorites, activeTab]);

  const counts = useMemo(() => {
    return {
      all: favorites.length,
      team: favorites.filter((f) => f.targetType === 'team').length,
      player: favorites.filter((f) => f.targetType === 'player').length,
      match: favorites.filter((f) => f.targetType === 'match').length,
    };
  }, [favorites]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-stext">Loading your favorites…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/25">
          <Heart size={32} />
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight text-mtext">Your Favorites Library</h1>
        <p className="mt-2 text-sm text-stext leading-relaxed">
          Sign in to view and manage your favorite teams, stars, and cricket fixtures all in one place.
        </p>
        <Link
          href="/login?returnTo=/favorites"
          className="btn-brand mt-6 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold shadow-sm transition-colors"
        >
          Sign In Now
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Page Header */}
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-lborder bg-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-widest text-stext">Personalized Hub</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-mtext sm:text-4xl">
              Favorites
            </h1>
            <p className="text-sm text-stext max-w-2xl">
              Keep track of matches, teams, and players you care about most. Instant updates and quick access.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-lborder bg-secondary px-4 py-2.5">
              <Heart size={18} className="text-danger" fill="currentColor" />
              <span className="text-sm font-black text-mtext">{counts.all}</span>
              <span className="text-xs font-semibold text-stext">Saved</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-lborder/60 pt-5">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            label="All Favorites"
            count={counts.all}
          />
          <TabButton
            active={activeTab === 'team'}
            onClick={() => setActiveTab('team')}
            label="Teams"
            icon={<Shield size={14} />}
            count={counts.team}
          />
          <TabButton
            active={activeTab === 'player'}
            onClick={() => setActiveTab('player')}
            label="Players"
            icon={<UserRound size={14} />}
            count={counts.player}
          />
          <TabButton
            active={activeTab === 'match'}
            onClick={() => setActiveTab('match')}
            label="Matches"
            icon={<Calendar size={14} />}
            count={counts.match}
          />
        </div>
      </header>

      {/* Main Content Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl border border-dashed border-lborder bg-card/50 px-4 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-stext">
            <Heart size={26} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-mtext">
            {activeTab === 'all' ? 'No favorites added yet' : `No favorite ${activeTab}s saved yet`}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-stext">
            Explore teams, player rosters, or upcoming matches and tap the heart button to quickly save them here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/matches"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-card hover:text-accent"
            >
              Browse Matches
            </Link>
            <Link
              href="/teams"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-card hover:text-accent"
            >
              Explore Teams
            </Link>
            <Link
              href="/players"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-card hover:text-accent"
            >
              Discover Players
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((fav) => {
            const data = enrichedMap[fav.id];
            if (fav.targetType === 'team') {
              return (
                <FavoriteTeamCard
                  key={fav.id}
                  fav={fav}
                  team={data?.team}
                  loading={data?.loading}
                  isBusy={busyId === fav.id}
                  onRemove={() => setDeleteTarget({ id: fav.id, name: data?.team?.name || 'Team' })}
                />
              );
            }
            if (fav.targetType === 'player') {
              return (
                <FavoritePlayerCard
                  key={fav.id}
                  fav={fav}
                  player={data?.player}
                  loading={data?.loading}
                  isBusy={busyId === fav.id}
                  onRemove={() => setDeleteTarget({ id: fav.id, name: data?.player?.fullName || data?.player?.name || 'Player' })}
                />
              );
            }
            if (fav.targetType === 'match') {
              return (
                <FavoriteMatchCard
                  key={fav.id}
                  fav={fav}
                  match={data?.match}
                  loading={data?.loading}
                  isBusy={busyId === fav.id}
                  onRemove={() => setDeleteTarget({ id: fav.id, name: 'Match' })}
                />
              );
            }
            return null;
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove favorite"
        message={`Are you sure you want to remove "${deleteTarget?.name}" from favorites?`}
        confirmLabel="Remove"
        onConfirm={remove}
        onCancel={() => setDeleteTarget(null)}
        loading={!!busyId}
        danger
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
        active
          ? 'btn-brand shadow-sm'
          : 'bg-secondary text-stext hover:bg-elevated hover:text-mtext'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
          active ? 'bg-white/20 text-white' : 'bg-card text-stext'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Cards for Favorites ─────────────────────────────────── */

function FavoriteTeamCard({
  fav,
  team,
  loading: _loading,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  team?: Team | null;
  loading?: boolean;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const name = team?.name || team?.abbr || (fav.targetId.startsWith('sr:') ? 'Cricket Team' : fav.targetId);
  const code = team?.abbr || team?.code || '';
  const country = team?.country || team?.city || 'Cricket Club';

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-lborder bg-card p-5 transition-colors hover:border-accent/40 hover:bg-elevated">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3">
          <Badge tone="neutral">Team</Badge>
          <button
            type="button"
            onClick={onRemove}
            disabled={isBusy}
            title="Remove from favorites"
            className="grid h-8 w-8 place-items-center rounded-lg text-stext transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>

        <Link href={`/teams/${fav.targetId}`} className="block">
          <div className="flex items-center gap-3.5 pt-1">
            {team?.logoUrl ? (
              <img
                src={String(team.logoUrl)}
                alt={name}
                className="h-12 w-12 shrink-0 rounded-full border border-white/10 bg-secondary object-cover"
              />
            ) : (
              <TeamLogo teamId={fav.targetId} name={name} code={code} size="md" link={false} />
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-mtext transition-colors group-hover:text-accent">
                {name}
              </h3>
              <p className="truncate text-xs font-semibold text-stext">
                {code ? `${code} · ${country}` : country}
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-5 border-t border-lborder/60 pt-3">
        <Link
          href={`/teams/${fav.targetId}`}
          className="inline-flex w-full items-center justify-between text-xs font-bold text-accent transition-colors hover:text-accent2"
        >
          <span>View Team Squad</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

function FavoritePlayerCard({
  fav,
  player,
  loading: _loading,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  player?: Player | null;
  loading?: boolean;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const name = player?.fullName || player?.name || player?.shortName || (fav.targetId.startsWith('sr:') ? 'Cricket Player' : fav.targetId);
  const role = player?.role || 'Player';
  const nationality = player?.nationality || player?.country || '';
  const team = player?.team?.name || player?.teamName || '';
  const initials = getInitials(name);

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-lborder bg-card p-5 transition-colors hover:border-accent/40 hover:bg-elevated">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3">
          <Badge tone="neutral">{role}</Badge>
          <button
            type="button"
            onClick={onRemove}
            disabled={isBusy}
            title="Remove from favorites"
            className="grid h-8 w-8 place-items-center rounded-lg text-stext transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>

        <Link href={`/players/${fav.targetId}`} className="block">
          <div className="flex items-center gap-3.5 pt-1">
            {(() => {
              let h = 0;
              for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
              const hue = Math.abs(h % 360);
              return (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                  style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))` }}>
                  {initials}
                </span>
              );
            })()}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-mtext transition-colors group-hover:text-accent">
                {name}
              </h3>
              <p className="truncate text-xs text-stext">
                {[nationality, team].filter(Boolean).join(' • ') || 'Pro Player'}
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mt-5 border-t border-lborder/60 pt-3">
        <Link
          href={`/players/${fav.targetId}`}
          className="inline-flex w-full items-center justify-between text-xs font-bold text-accent transition-colors hover:text-accent2"
        >
          <span>View Player Profile</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

function FavoriteMatchCard({
  fav,
  match,
  loading: _loading,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  match?: Match | null;
  loading?: boolean;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const codes = match?.teams || [];
  const names = match?.teamNames || [];
  const homeCode = codes[0] || '';
  const awayCode = codes[1] || '';
  const homeName = (names[0] && !names[0].startsWith('sr:')) ? names[0] : homeCode || 'Team A';
  const awayName = (names[1] && !names[1].startsWith('sr:')) ? names[1] : awayCode || 'Team B';
  const tournament = match?.tournament || match?.tournamentName || 'Match Fixture';
  const status = match?.status || 'Match';
  const { date, time } = formatScheduled(match?.scheduled);

  const isLive = match?.status === 'live';
  const isUpcoming = match?.status === 'upcoming';
  const isCompleted = match?.status === 'completed';

  const tone = isLive ? 'live' : isUpcoming ? 'upcoming' : isCompleted ? 'completed' : 'neutral';

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-md border border-lborder bg-card p-5 transition-colors hover:border-accent/40 hover:bg-elevated">
      <div>
        <div className="flex items-center justify-between gap-2 pb-3">
          <Badge tone={tone}>{status}</Badge>
          <button
            type="button"
            onClick={onRemove}
            disabled={isBusy}
            title="Remove from favorites"
            className="grid h-8 w-8 place-items-center rounded-lg text-stext transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
          >
            {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>

        <Link href={`/matches/${fav.targetId}`} className="block">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-accent">
            {tournament}
          </p>
          <div className="mt-2 space-y-1">
            <h3 className="truncate text-base font-bold text-mtext transition-colors group-hover:text-accent">
              {homeName} vs {awayName}
            </h3>
            {(date || time) && (
              <p className="flex items-center gap-1.5 text-xs text-stext">
                <Calendar size={12} />
                <span>{date}</span>
                {time && <span>· {time}</span>}
              </p>
            )}
            {match?.venue && (
              <p className="flex items-center gap-1.5 truncate text-[11px] text-stext">
                <MapPin size={11} className="shrink-0 text-stext/80" />
                <span className="truncate">{match.venue}</span>
              </p>
            )}
          </div>
        </Link>
      </div>

      <div className="mt-5 border-t border-lborder/60 pt-3">
        <Link
          href={`/matches/${fav.targetId}`}
          className="inline-flex w-full items-center justify-between text-xs font-bold text-accent transition-colors hover:text-accent2"
        >
          <span>Match Scorecard & Details</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
