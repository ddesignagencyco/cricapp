'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listFavorites, removeFavorite, type FavoriteItem, type FavoriteTarget } from '../../services/favorites';
import { useAuth } from '../../components/AuthProvider';
import RemoteImage from '../../components/RemoteImage';
import { StatusBadge } from '../../components/Badge';
import Tabs from '../../components/Tabs';
import EmptyState from '../../components/EmptyState';
import { formatScheduled, getInitials, getPslLogo } from '../../utils/helpers';
import { ConfirmDialog } from '../../components/admin/AdminShared';
import type { Team, Player, Match, NewsArticle, Tour, TournamentApi, TabItem } from '../../types/index';
import { FavoritesPageSkeleton } from '../../components/skeletons/Skeletons';
import { newsHref } from '../../utils/newsConstraints';
import NewsCopy from '../../components/NewsCopy';
import { isSportRadarId, str } from '../../utils/extract';

interface EnrichedFavorite {
  item: FavoriteItem;
  team?: Team | null;
  player?: Player | null;
  match?: Match | null;
  news?: NewsArticle | null;
  tour?: Tour | null;
  tournament?: TournamentApi | null;
}

type TabKey = 'all' | FavoriteTarget;

const SECTION_ORDER: {
  key: FavoriteTarget;
  label: string;
  icon: typeof Shield;
  href: string;
  emptyHint: string;
}[] = [
  { key: 'team', label: 'Teams', icon: Shield, href: '/teams', emptyHint: 'Explore teams and tap the heart to save them.' },
  { key: 'player', label: 'Players', icon: UserRound, href: '/players', emptyHint: 'Browse players and tap the heart to save them.' },
  { key: 'match', label: 'Matches', icon: Calendar, href: '/matches', emptyHint: 'Follow matches and tap the heart to save them.' },
  { key: 'news', label: 'News', icon: Newspaper, href: '/news', emptyHint: 'Read articles and tap the heart to save them.' },
  { key: 'tour', label: 'Tours', icon: Globe, href: '/tours', emptyHint: 'Discover tours and tap the heart to save them.' },
  { key: 'tournament', label: 'Tournaments', icon: Trophy, href: '/tournaments', emptyHint: 'Follow tournaments and tap the heart to save them.' },
];

export default function FavoritesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [enrichedMap, setEnrichedMap] = useState<Record<string, EnrichedFavorite>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

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
          const target = asRecord(item.target);
          initial[item.id] = {
            item,
            team: item.targetType === 'team' ? (target as Team | null) : undefined,
            player: item.targetType === 'player' ? (target as Player | null) : undefined,
            match: item.targetType === 'match' ? (target as Match | null) : undefined,
            news: item.targetType === 'news' ? mapFavoriteNews(target) : undefined,
            tour: item.targetType === 'tour' ? (target as Tour | null) : undefined,
            tournament: item.targetType === 'tournament' ? (target as TournamentApi | null) : undefined,
          };
        }
        setEnrichedMap(initial);
      })
      .catch(() => {
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

  const counts = useMemo(
    () => ({
      all: favorites.length,
      team: favorites.filter((f) => f.targetType === 'team').length,
      player: favorites.filter((f) => f.targetType === 'player').length,
      match: favorites.filter((f) => f.targetType === 'match').length,
      news: favorites.filter((f) => f.targetType === 'news').length,
      tour: favorites.filter((f) => f.targetType === 'tour').length,
      tournament: favorites.filter((f) => f.targetType === 'tournament').length,
    }),
    [favorites],
  );

  const grouped = useMemo(() => {
    const map: Record<FavoriteTarget, FavoriteItem[]> = {
      team: [],
      player: [],
      match: [],
      news: [],
      tour: [],
      tournament: [],
    };
    for (const favorite of favorites) {
      map[favorite.targetType].push(favorite);
    }
    return map;
  }, [favorites]);

  const visibleSections = useMemo(() => {
    if (activeTab === 'all') return SECTION_ORDER.filter((section) => counts[section.key] > 0);
    return SECTION_ORDER.filter((section) => section.key === activeTab);
  }, [activeTab, counts]);

  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'all', label: 'All', count: counts.all },
      ...SECTION_ORDER.map((section) => ({
        key: section.key,
        label: section.label,
        count: counts[section.key],
      })),
    ],
    [counts],
  );

  if (authLoading || loading) {
    return <FavoritesPageSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative mb-6">
          <div className="grid h-20 w-20 place-items-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/20">
            <Heart size={36} />
          </div>
          <div className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-brand text-white shadow-lg">
            <Sparkles size={14} />
          </div>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-mtext sm:text-3xl">Your Favorites</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-stext">
          Sign in to save teams, players, matches, news, tours and tournaments you care about — all in one place.
        </p>
        <Link
          href="/login?returnTo=/favorites"
          className="btn-brand mt-8 inline-flex items-center gap-2 rounded-md px-7 py-3 text-sm font-bold shadow-md transition-all hover:shadow-lg"
        >
          Sign In
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6">
      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent">
              <Heart size={13} fill="currentColor" className="text-danger" />
              Your collection
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-mtext">Favorites</h1>
            <p className="mt-1 text-sm leading-relaxed text-stext">
              Everything you follow — teams, players, matches, news, tours and tournaments — in one place.
            </p>
          </div>
          {counts.all > 0 && (
            <div className="flex flex-wrap gap-2">
              {SECTION_ORDER.filter((section) => counts[section.key] > 0).map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveTab(section.key)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-lborder bg-secondary px-3 py-1.5 text-xs font-semibold text-mtext transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <Icon size={13} className="text-accent" />
                    <span>{counts[section.key]}</span>
                    <span className="text-stext">{section.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <Tabs
        size="sm"
        active={activeTab}
        onChange={(key) => setActiveTab(isTabKey(key) ? key : 'all')}
        tabs={tabs}
      />

      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet"
          message="Start exploring and tap the heart icon on any team, player, match, or article to save it here."
        >
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {SECTION_ORDER.slice(0, 5).map((section) => (
              <Link
                key={section.key}
                href={section.href}
                className="rounded-md border border-lborder bg-secondary px-4 py-2 text-xs font-bold text-mtext transition-colors hover:border-accent/40 hover:text-accent"
              >
                {section.label}
              </Link>
            ))}
          </div>
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {visibleSections.map((section) => {
            const items = grouped[section.key];
            if (items.length === 0) {
              return (
                <SectionEmpty
                  key={section.key}
                  icon={section.icon}
                  label={section.label}
                  hint={section.emptyHint}
                  href={section.href}
                />
              );
            }
            return (
              <section key={section.key}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-md bg-accent/10 text-accent">
                      <section.icon size={16} />
                    </div>
                    <h2 className="text-lg font-semibold text-mtext">{section.label}</h2>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-bold text-stext">{items.length}</span>
                  </div>
                  <Link
                    href={section.href}
                    className="group/link flex items-center gap-1 text-xs font-bold text-accent transition-colors hover:text-accent"
                  >
                    Browse more
                    <ChevronRight size={14} className="transition-transform group-hover/link:translate-x-0.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {items.map((fav) => (
                    <FavoriteCard
                      key={fav.id}
                      fav={fav}
                      data={enrichedMap[fav.id]}
                      isBusy={busyId === fav.id}
                      onRemove={(name) => setDeleteTarget({ id: fav.id, name })}
                    />
                  ))}
                </div>
              </section>
            );
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

function FavoriteCard({
  fav,
  data,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  data?: EnrichedFavorite;
  isBusy: boolean;
  onRemove: (_name: string) => void;
}) {
  switch (fav.targetType) {
    case 'team': {
      const name = humanLabel(data?.team?.name, humanLabel(data?.team?.abbr, 'Cricket Team'));
      return <TeamFavCard fav={fav} team={data?.team} name={name} isBusy={isBusy} onRemove={() => onRemove(name)} />;
    }
    case 'player': {
      const name = humanLabel(
        data?.player?.fullName,
        humanLabel(data?.player?.name, humanLabel(data?.player?.shortName, 'Cricket Player')),
      );
      return <PlayerFavCard fav={fav} player={data?.player} name={name} isBusy={isBusy} onRemove={() => onRemove(name)} />;
    }
    case 'match': {
      const sides = matchSides(data?.match);
      return (
        <MatchFavCard
          fav={fav}
          match={data?.match}
          home={sides.home}
          away={sides.away}
          isBusy={isBusy}
          onRemove={() => onRemove(`${sides.home.name} vs ${sides.away.name}`)}
        />
      );
    }
    case 'news': {
      const name = humanLabel(data?.news?.title, 'News');
      return <NewsFavCard fav={fav} news={data?.news} name={name} isBusy={isBusy} onRemove={() => onRemove(name)} />;
    }
    case 'tour': {
      const name = humanLabel(data?.tour?.name, 'Tour');
      return <TourFavCard fav={fav} tour={data?.tour} name={name} isBusy={isBusy} onRemove={() => onRemove(name)} />;
    }
    case 'tournament': {
      const name = humanLabel(data?.tournament?.name, 'Tournament');
      return (
        <TournamentFavCard
          fav={fav}
          tournament={data?.tournament}
          name={name}
          isBusy={isBusy}
          onRemove={() => onRemove(name)}
        />
      );
    }
    default: {
      const _exhaustive: never = fav.targetType;
      void _exhaustive;
      return null;
    }
  }
}

function TeamFavCard({
  fav,
  team,
  name,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  team?: Team | null;
  name: string;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const code = shortCode(team?.abbr || team?.code);
  const country = humanLabel(team?.country, humanLabel(team?.city, 'Cricket team'));
  const href = `/teams/${fav.targetId}`;
  const logo = typeof team?.logoUrl === 'string' ? team.logoUrl : typeof team?.logo === 'string' ? team.logo : getPslLogo(code) || getPslLogo(String(team?.id || fav.targetId));
  const initials = code || getInitials(name);

  return (
    <FavShell isBusy={isBusy} onRemove={onRemove}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        {logo ? (
          <RemoteImage
            src={logo}
            alt={name}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full border border-lborder bg-white object-contain p-1"
          />
        ) : (
          <Avatar hue={hueFrom(name)} initials={initials} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent">{name}</h3>
            {code && <span className="shrink-0 font-mono text-xs uppercase text-stext">{code}</span>}
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-stext">
            <Globe size={11} className="shrink-0" />
            {country}
          </p>
        </div>
      </Link>
    </FavShell>
  );
}

function PlayerFavCard({
  fav,
  player,
  name,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  player?: Player | null;
  name: string;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const role = formatRole(player?.role);
  const nationality = humanLabel(player?.nationality, humanLabel(player?.country, ''));
  const teamName = humanLabel(player?.team?.name, humanLabel(player?.teamName, 'Independent player'));
  const href = `/players/${fav.targetId}`;
  const photo = typeof player?.profileUrl === 'string' ? player.profileUrl : '';

  return (
    <FavShell isBusy={isBusy} onRemove={onRemove}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        {photo ? (
          <RemoteImage
            src={photo}
            alt={name}
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 rounded-full border border-lborder bg-secondary object-cover"
          />
        ) : (
          <Avatar hue={hueFrom(name)} initials={getInitials(name)} size="lg" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent">{name}</h3>
            <span className="shrink-0 rounded border border-lborder bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-stext">
              {role}
            </span>
          </div>
          <p className="mt-1 flex min-w-0 items-center gap-3 text-xs text-stext">
            <span className="flex min-w-0 items-center gap-1 truncate">
              <Shield size={11} className="shrink-0" />
              <span className="truncate">{teamName}</span>
            </span>
            {nationality && (
              <span className="flex min-w-0 items-center gap-1 truncate">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{nationality}</span>
              </span>
            )}
          </p>
        </div>
      </Link>
    </FavShell>
  );
}

function MatchFavCard({
  fav,
  match,
  home,
  away,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  match?: Match | null;
  home: MatchSide;
  away: MatchSide;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const tournament = humanLabel(match?.tournamentName, humanLabel(match?.tournament, 'Cricket'));
  const status = typeof match?.status === 'string' ? match.status : '';
  const { date, time } = formatScheduled(match?.scheduled);
  const venue = humanLabel(match?.venue, '');
  const href = `/matches/${fav.targetId}`;

  return (
    <div className="elev-card group flex h-full flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-stext">{tournament}</p>
        <div className="flex shrink-0 items-center gap-1">
          {status && <StatusBadge status={status} />}
          <RemoveBtn isBusy={isBusy} onRemove={onRemove} always />
        </div>
      </div>

      <Link href={href} prefetch={false} className="block space-y-1.5">
        <MatchTeamRow name={home.name} code={home.code} />
        <MatchTeamRow name={away.name} code={away.code} />
      </Link>

      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-lborder pt-2 text-xs text-stext">
        <span className="inline-flex min-w-0 items-center gap-1 font-semibold tabular-nums text-accent">
          <Calendar size={12} />
          {date || 'TBD'}
          {time ? ` · ${time}` : ''}
        </span>
        {venue && (
          <span className="inline-flex max-w-[48%] items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{venue}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function NewsFavCard({
  fav,
  news,
  name,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  news?: NewsArticle | null;
  name: string;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const href = news ? newsHref(news) : `/news/${fav.targetId}`;
  const category = humanLabel(news?.category, 'News');

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-md border border-lborder bg-card transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
        {news?.image ? (
          <RemoteImage
            src={news.image}
            alt={name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-stext/40">
            <Newspaper size={36} />
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <RemoveBtn isBusy={isBusy} onRemove={onRemove} always />
        </div>
        <div className="absolute bottom-2.5 left-2.5">
          <span className="rounded bg-elevated px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stext ring-1 ring-lborder">
            {category}
          </span>
        </div>
      </div>
      <Link href={href} className="flex flex-1 flex-col p-4">
        <NewsCopy
          as="h3"
          language={news?.language}
          text={name}
          className="line-clamp-2 text-sm font-semibold text-mtext transition-colors group-hover:text-accent"
        >
          {name}
        </NewsCopy>
        {news?.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stext">{news.excerpt}</p>
        )}
        <div className="mt-3 flex items-center gap-3 text-[11px] text-stext">
          {news?.date && <span>{news.date}</span>}
          {news?.author && <span>by {news.author}</span>}
        </div>
      </Link>
    </div>
  );
}

function TourFavCard({
  tour,
  name,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  tour?: Tour | null;
  name: string;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const country = humanLabel(str(tour?.category), 'International');
  const sport = humanLabel(str(tour?.sport), 'Cricket');
  const href = `/tournaments?country=${encodeURIComponent(country)}`;

  return (
    <FavShell isBusy={isBusy} onRemove={onRemove}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-lborder bg-secondary text-accent">
          <Globe size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent">{name}</h3>
          <p className="mt-0.5 truncate text-xs text-stext">
            {country} · {sport}
          </p>
        </div>
      </Link>
    </FavShell>
  );
}

function TournamentFavCard({
  fav,
  tournament,
  name,
  isBusy,
  onRemove,
}: {
  fav: FavoriteItem;
  tournament?: TournamentApi | null;
  name: string;
  isBusy: boolean;
  onRemove: () => void;
}) {
  const category = humanLabel(str(tournament?.category), 'International');
  const format = humanLabel(str(tournament?.type).replace(/_/g, ' '), 'Cricket').toUpperCase();
  const gender = humanLabel(tournament?.gender, '');
  const href = `/tournaments/${fav.targetId}`;

  return (
    <FavShell isBusy={isBusy} onRemove={onRemove}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-lborder bg-secondary text-accent">
          <Trophy size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent">{name}</h3>
            <span className="shrink-0 rounded border border-lborder bg-secondary px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-stext">
              {format}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-stext">
            {category}
            {gender ? ` · ${gender}` : ''}
          </p>
        </div>
      </Link>
    </FavShell>
  );
}

function FavShell({
  children,
  isBusy,
  onRemove,
}: {
  children: ReactNode;
  isBusy: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="elev-card group flex items-center gap-2 rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]">
      {children}
      <RemoveBtn isBusy={isBusy} onRemove={onRemove} always />
    </div>
  );
}

function SectionEmpty({
  icon: Icon,
  label,
  hint,
  href,
}: {
  icon: typeof Shield;
  label: string;
  hint: string;
  href: string;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-accent/10 text-accent">
          <Icon size={16} />
        </div>
        <h2 className="text-lg font-semibold text-mtext">{label}</h2>
      </div>
      <div className="flex items-center gap-4 rounded-md border border-dashed border-lborder bg-card/30 px-5 py-4">
        <Heart size={18} className="shrink-0 text-stext" />
        <p className="flex-1 text-sm text-stext">{hint}</p>
        <Link
          href={href}
          className="shrink-0 rounded-md border border-lborder bg-secondary px-3 py-1.5 text-xs font-bold text-accent transition-colors hover:bg-[var(--color-row-hover)]"
        >
          Browse
        </Link>
      </div>
    </section>
  );
}

function RemoveBtn({ isBusy, onRemove, always = false }: { isBusy: boolean; onRemove: () => void; always?: boolean }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRemove();
      }}
      disabled={isBusy}
      title="Remove from favorites"
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-stext transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50 ${
        always ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
    >
      {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}

function Avatar({ hue, initials, size = 'md' }: { hue: number; initials: string; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-12 w-12 text-sm' : 'h-11 w-11 text-sm';
  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-full font-semibold text-white`}
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 68%, 46%), hsl(${(hue + 38) % 360}, 72%, 32%))` }}
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}

function MatchTeamRow({ name, code }: { name: string; code: string }) {
  const pslLogo = getPslLogo(code);
  const hue = hueFrom(code || name);
  return (
    <div className="flex items-center gap-2.5">
      {pslLogo ? (
        <RemoteImage
          src={pslLogo}
          alt={name}
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-full border border-lborder bg-white object-contain p-0.5"
        />
      ) : (
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 65%, 48%), hsl(${(hue + 28) % 360}, 75%, 32%))` }}
        >
          {getInitials(name || code)}
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-mtext">{name}</p>
    </div>
  );
}

interface MatchSide {
  name: string;
  code: string;
}

function matchSides(match?: Match | null): { home: MatchSide; away: MatchSide } {
  return {
    home: pickMatchSide(match, 0, 'Team A'),
    away: pickMatchSide(match, 1, 'Team B'),
  };
}

function pickMatchSide(match: Match | null | undefined, index: 0 | 1, fallback: string): MatchSide {
  const teams = match?.teams as unknown;
  const isObj = Boolean(teams && typeof teams === 'object' && !Array.isArray(teams));
  const side = isObj
    ? index === 0
      ? (teams as { home?: { name?: string; code?: string; abbr?: string } }).home
      : (teams as { away?: { name?: string; code?: string; abbr?: string } }).away
    : null;
  const rawCode = side?.code || side?.abbr || (Array.isArray(teams) ? String(teams[index] || '') : '');
  const rawName = side?.name || match?.teamNames?.[index] || '';
  const name = humanLabel(rawName, humanLabel(rawCode, fallback));
  const code = shortCode(rawCode) || getInitials(name);
  return { name, code };
}

function mapFavoriteNews(target: Record<string, unknown> | null): NewsArticle | null {
  if (!target?.id || !target.title) return null;
  const authorRef = target.authorRef as { name?: string } | undefined;
  const category = target.category as { name?: string } | string | undefined;
  return {
    id: String(target.id),
    slug: typeof target.slug === 'string' ? target.slug : undefined,
    title: String(target.title),
    category: typeof category === 'string' ? category : humanLabel(category?.name, 'News'),
    type: '',
    date: target.publishedAt
      ? new Date(String(target.publishedAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '',
    author: authorRef?.name || String(target.author || 'Editorial'),
    readTime: '',
    excerpt: String(target.summary || ''),
    content: '',
    language: typeof target.language === 'string' ? target.language : 'en',
    image: typeof target.imageUrl === 'string' ? target.imageUrl : undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function humanLabel(value: unknown, fallback: string): string {
  const text = str(value);
  if (text) return text;
  if (typeof value === 'string' && isSportRadarId(value)) return fallback;
  return fallback;
}

function shortCode(value: unknown): string {
  const text = str(value);
  if (!text || text.length > 5) return '';
  return text.toUpperCase();
}

function formatRole(raw?: string): string {
  const clean = String(raw || 'Player').replace(/_/g, ' ').trim();
  return clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function hueFrom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % 360);
}

function isTabKey(value: string): value is TabKey {
  switch (value) {
    case 'all':
    case 'team':
    case 'player':
    case 'match':
    case 'news':
    case 'tour':
    case 'tournament':
      return true;
    default:
      return false;
  }
}
