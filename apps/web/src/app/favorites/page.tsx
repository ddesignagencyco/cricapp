'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Heart,
  Loader2,
  MapPin,
  Newspaper,
  Shield,
  Trash2,
  Trophy,
  UserRound,
  ArrowRight,
  Sparkles,
  Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listFavorites, removeFavorite, type FavoriteItem } from '../../services/favorites';
import { useAuth } from '../../components/AuthProvider';
import TeamLogo from '../../components/TeamLogo';
import RemoteImage from '../../components/RemoteImage';
import Badge, { StatusBadge } from '../../components/Badge';
import { formatScheduled, getInitials } from '../../utils/helpers';
import { ConfirmDialog } from '../../components/admin/AdminShared';
import type { Team, Player, Match, NewsArticle, Tour, TournamentApi } from '../../types/index';
import { FavoritesPageSkeleton } from '../../components/skeletons/Skeletons';
import { newsHref } from '../../utils/newsConstraints';
import NewsCopy from '../../components/NewsCopy';
import { str } from '../../utils/extract';

interface EnrichedFavorite {
  item: FavoriteItem;
  team?: Team | null;
  player?: Player | null;
  match?: Match | null;
  news?: NewsArticle | null;
  tour?: Tour | null;
  tournament?: TournamentApi | null;
  loading: boolean;
}

export default function FavoritesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [enrichedMap, setEnrichedMap] = useState<Record<string, EnrichedFavorite>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<
    'all' | 'team' | 'player' | 'match' | 'news' | 'tour' | 'tournament'
  >('all');

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    listFavorites(undefined, { expand: true, limit: 100 })
      .then((items) => {
        setFavorites(items);
        const initial: Record<string, EnrichedFavorite> = {};
        for (const item of items) {
          const target = item.target as Record<string, unknown> | undefined;
          initial[item.id] = {
            item,
            loading: false,
            team: item.targetType === 'team' ? ((target as Team) || null) : undefined,
            player: item.targetType === 'player' ? ((target as Player) || null) : undefined,
            match: item.targetType === 'match' ? ((target as Match) || null) : undefined,
            news: item.targetType === 'news' ? (mapFavoriteNews(target) || null) : undefined,
            tour: item.targetType === 'tour' ? ((target as Tour) || null) : undefined,
            tournament: item.targetType === 'tournament' ? ((target as TournamentApi) || null) : undefined,
          };
        }
        setEnrichedMap(initial);
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
      news: favorites.filter((f) => f.targetType === 'news').length,
      tour: favorites.filter((f) => f.targetType === 'tour').length,
      tournament: favorites.filter((f) => f.targetType === 'tournament').length,
    };
  }, [favorites]);

  if (authLoading || loading) {
    return <FavoritesPageSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/25">
          <Heart size={32} />
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight text-mtext">Your Favorites Library</h1>
        <p className="mt-2 text-sm text-stext leading-relaxed">
          Sign in to save teams, players, matches, news, tours and tournaments.
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
              Keep track of matches, teams, players, news, tours and tournaments you care about.
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
          <TabButton
            active={activeTab === 'news'}
            onClick={() => setActiveTab('news')}
            label="News"
            icon={<Newspaper size={14} />}
            count={counts.news}
          />
          <TabButton
            active={activeTab === 'tour'}
            onClick={() => setActiveTab('tour')}
            label="Tours"
            icon={<Globe size={14} />}
            count={counts.tour}
          />
          <TabButton
            active={activeTab === 'tournament'}
            onClick={() => setActiveTab('tournament')}
            label="Tournaments"
            icon={<Trophy size={14} />}
            count={counts.tournament}
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
            Explore teams, players, matches, news, tours or tournaments and tap the heart to save them here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/matches"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-[var(--color-row-hover)] hover:text-accent"
            >
              Browse Matches
            </Link>
            <Link
              href="/teams"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-[var(--color-row-hover)] hover:text-accent"
            >
              Explore Teams
            </Link>
            <Link
              href="/players"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-[var(--color-row-hover)] hover:text-accent"
            >
              Discover Players
            </Link>
            <Link
              href="/news"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-[var(--color-row-hover)] hover:text-accent"
            >
              Read News
            </Link>
            <Link
              href="/tours"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-[var(--color-row-hover)] hover:text-accent"
            >
              Browse Tours
            </Link>
            <Link
              href="/tournaments"
              className="rounded-xl border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:bg-[var(--color-row-hover)] hover:text-accent"
            >
              Browse Tournaments
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
            if (fav.targetType === 'news') {
              return (
                <FavoriteNewsCard
                  key={fav.id}
                  fav={fav}
                  news={data?.news}
                  showImage={activeTab === 'news'}
                  isBusy={busyId === fav.id}
                  onRemove={() => setDeleteTarget({ id: fav.id, name: data?.news?.title || 'News' })}
                />
              );
            }
            if (fav.targetType === 'tour') {
              return (
                <FavoriteTourCard
                  key={fav.id}
                  fav={fav}
                  tour={data?.tour}
                  isBusy={busyId === fav.id}
                  onRemove={() => setDeleteTarget({ id: fav.id, name: data?.tour?.name || 'Tour' })}
                />
              );
            }
            if (fav.targetType === 'tournament') {
              return (
                <FavoriteTournamentCard
                  key={fav.id}
                  fav={fav}
                  tournament={data?.tournament}
                  isBusy={busyId === fav.id}
                  onRemove={() => setDeleteTarget({ id: fav.id, name: data?.tournament?.name || 'Tournament' })}
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

function mapFavoriteNews(target: Record<string, unknown> | undefined): NewsArticle | null {
  if (!target?.id || !target.title) return null;
  const authorRef = target.authorRef as { name?: string } | undefined;
  return {
    id: String(target.id),
    slug: typeof target.slug === 'string' ? target.slug : undefined,
    title: String(target.title),
    category: typeof (target.category as { name?: string } | undefined)?.name === 'string'
      ? String((target.category as { name: string }).name)
      : 'News',
    type: '',
    date: target.publishedAt ? new Date(String(target.publishedAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    author: authorRef?.name || String(target.author || 'Editorial'),
    readTime: '',
    excerpt: String(target.summary || ''),
    content: '',
    language: typeof target.language === 'string' ? target.language : 'en',
    image: typeof target.imageUrl === 'string' ? target.imageUrl : undefined,
  };
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
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
        active
          ? 'btn-brand shadow-sm'
          : 'bg-secondary text-stext hover:bg-[var(--color-row-hover)] hover:text-mtext'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[11px] font-black ${
          active ? 'bg-white/20 text-white' : 'bg-card text-stext'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Cards for Favorites ─────────────────────────────────── */

function FavoriteCardFrame({
  label,
  href,
  actionLabel,
  isBusy,
  onRemove,
  prefetch,
  image,
  children,
}: {
  label: string;
  href: string;
  actionLabel: string;
  isBusy: boolean;
  onRemove: () => void;
  prefetch?: boolean;
  image?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative flex h-full min-h-[230px] flex-col overflow-hidden rounded-md border border-lborder bg-card transition-colors hover:border-accent/40 hover:bg-[var(--color-row-hover)]">
      <div className="flex items-center justify-between gap-2 px-5 pt-4">
        <Badge tone="neutral">{label}</Badge>
        <button
          type="button"
          onClick={onRemove}
          disabled={isBusy}
          title="Remove from favorites"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stext transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
      {image}
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-3">
        <Link href={href} prefetch={prefetch} className="block min-h-0 flex-1">
          {children}
        </Link>
        <Link
          href={href}
          prefetch={prefetch}
          className="mt-4 inline-flex w-full items-center justify-between border-t border-lborder/60 pt-3 text-xs font-bold text-accent"
        >
          <span>{actionLabel}</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

function FavoriteAvatar({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border border-lborder bg-secondary">
      {children}
    </div>
  );
}

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
    <FavoriteCardFrame
      label="Team"
      href={`/teams/${fav.targetId}`}
      actionLabel="View Team Squad"
      isBusy={isBusy}
      onRemove={onRemove}
    >
      <div className="flex items-center gap-3.5">
        <FavoriteAvatar>
          {team?.logoUrl ? (
            <RemoteImage
              src={String(team.logoUrl)}
              alt={name}
              width={48}
              height={48}
              className="h-12 w-12 object-cover"
            />
          ) : (
            <TeamLogo teamId={fav.targetId} name={name} code={code} size="md" link={false} />
          )}
        </FavoriteAvatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-mtext transition-colors group-hover:text-accent">
            {name}
          </h3>
          <p className="mt-0.5 truncate text-xs font-semibold text-stext">
            {code ? `${code} · ${country}` : country}
          </p>
        </div>
      </div>
    </FavoriteCardFrame>
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
  const role = String(player?.role || 'Player').replace(/_/g, ' ');
  const nationality = player?.nationality || player?.country || '';
  const team = player?.team?.name || player?.teamName || '';
  const initials = getInitials(name);
  let hue = 0;
  for (let i = 0; i < name.length; i++) hue = name.charCodeAt(i) + ((hue << 5) - hue);
  hue = Math.abs(hue % 360);

  return (
    <FavoriteCardFrame
      label="Player"
      href={`/players/${fav.targetId}`}
      actionLabel="View Player Profile"
      isBusy={isBusy}
      onRemove={onRemove}
    >
      <div className="flex items-center gap-3.5">
        <FavoriteAvatar>
          <span
            className="grid h-12 w-12 place-items-center text-sm font-black text-white"
            style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))` }}
          >
            {initials}
          </span>
        </FavoriteAvatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-mtext transition-colors group-hover:text-accent">
            {name}
          </h3>
          <p className="mt-0.5 truncate text-xs text-stext">
            {[role, nationality, team].filter(Boolean).join(' • ') || 'Player'}
          </p>
        </div>
      </div>
    </FavoriteCardFrame>
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
  const status = match?.status || '';
  const { date, time } = formatScheduled(match?.scheduled);

  return (
    <FavoriteCardFrame
      label="Match"
      href={`/matches/${fav.targetId}`}
      actionLabel="Match Scorecard & Details"
      isBusy={isBusy}
      onRemove={onRemove}
      prefetch={false}
    >
      <div className="flex items-start gap-3.5">
        <FavoriteAvatar>
          <Calendar size={18} className="text-accent" />
        </FavoriteAvatar>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {status ? <StatusBadge status={status} /> : null}
            <p className="truncate text-[11px] font-bold uppercase tracking-wider text-accent">
              {tournament}
            </p>
          </div>
          <h3 className="truncate text-base font-bold text-mtext transition-colors group-hover:text-accent">
            {homeName} vs {awayName}
          </h3>
          {(date || time) && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-stext">
              <span>{date}</span>
              {time ? <span>· {time}</span> : null}
            </p>
          )}
          {match?.venue ? (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-stext">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{match.venue}</span>
            </p>
          ) : null}
        </div>
      </div>
    </FavoriteCardFrame>
  );
}

function FavoriteNewsCard({
  fav,
  news,
  showImage = false,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  news?: NewsArticle | null;
  showImage?: boolean;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const title = news?.title || 'News';
  const href = news ? newsHref(news) : `/news/${fav.targetId}`;
  const image = showImage && news?.image ? (
    <Link href={href} className="relative mx-5 mt-3 block aspect-[16/9] overflow-hidden rounded-md bg-secondary">
      <RemoteImage src={news.image} alt={title} fill sizes="(min-width: 768px) 25vw, 100vw" className="object-cover" />
    </Link>
  ) : null;

  return (
    <FavoriteCardFrame
      label="News"
      href={href}
      actionLabel="Read article"
      isBusy={isBusy}
      onRemove={onRemove}
      image={image}
    >
      {showImage ? (
        <div>
          <NewsCopy
            as="p"
            language={news?.language}
            text={title}
            className="news-copy-card line-clamp-2 text-base font-bold text-mtext transition-colors group-hover:text-accent"
          >
            {title}
          </NewsCopy>
          {news?.date ? <p className="mt-1 text-xs text-stext">{news.date}</p> : null}
        </div>
      ) : (
        <div className="flex items-center gap-3.5">
          <FavoriteAvatar>
            <Newspaper size={18} className="text-accent" />
          </FavoriteAvatar>
          <div className="min-w-0 flex-1">
            <NewsCopy
              as="h3"
              language={news?.language}
              text={title}
              className="news-copy-card line-clamp-2 text-base font-bold text-mtext transition-colors group-hover:text-accent"
            >
              {title}
            </NewsCopy>
            {news?.date ? <p className="mt-0.5 truncate text-xs text-stext">{news.date}</p> : null}
          </div>
        </div>
      )}
    </FavoriteCardFrame>
  );
}

function FavoriteTourCard({
  fav: _fav,
  tour,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  tour?: Tour | null;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const name = tour?.name || 'Tour';
  const country = str(tour?.category) || 'International';
  const sport = str(tour?.sport) || 'Cricket';
  const href = `/tournaments?country=${encodeURIComponent(country)}`;

  return (
    <FavoriteCardFrame
      label="Tour"
      href={href}
      actionLabel="Browse related tournaments"
      isBusy={isBusy}
      onRemove={onRemove}
    >
      <div className="flex items-center gap-3.5">
        <FavoriteAvatar>
          <Globe size={18} className="text-accent" />
        </FavoriteAvatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-mtext transition-colors group-hover:text-accent">
            {name}
          </h3>
          <p className="mt-0.5 truncate text-xs font-semibold text-stext">
            {country} · {sport}
          </p>
        </div>
      </div>
    </FavoriteCardFrame>
  );
}

function FavoriteTournamentCard({
  fav,
  tournament,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  tournament?: TournamentApi | null;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const name = tournament?.name || 'Tournament';
  const category = str(tournament?.category) || 'International';
  const format = str(tournament?.type).replace(/_/g, ' ') || 'Cricket';
  const gender = tournament?.gender || '';

  return (
    <FavoriteCardFrame
      label="Tournament"
      href={`/tournaments/${fav.targetId}`}
      actionLabel="View tournament"
      isBusy={isBusy}
      onRemove={onRemove}
    >
      <div className="flex items-center gap-3.5">
        <FavoriteAvatar>
          <Trophy size={18} className="text-accent" />
        </FavoriteAvatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-mtext transition-colors group-hover:text-accent">
            {name}
          </h3>
          <p className="mt-0.5 truncate text-xs font-semibold text-stext">
            {[format, category, gender].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </FavoriteCardFrame>
  );
}

