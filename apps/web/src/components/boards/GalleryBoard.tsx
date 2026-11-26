'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Clapperboard, Expand, Images, Play, Video } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import MediaActions from '../MediaActions';
import Pagination from '../Pagination';
import PageToolbar from '../PageToolbar';
import Tabs from '../Tabs';
import AdSlot from '../advertisements/AdSlot';
import EditorialSidebar from './EditorialSidebar';
import PhotoLightbox from '../gallery/PhotoLightbox';
import ShortsViewer from '../gallery/ShortsViewer';
import type { GalleryPhoto, GalleryShort } from '../gallery/galleryTypes';
import { fetchGalleryPage, type GalleryMedia } from '../../services/gallery';
import { galleryKeys } from '../../queries/keys';
import { useGalleryQuery, usePrefetchNextPage } from '../../queries/useDirectoryQueries';

export type GalleryTab = 'images' | 'shorts' | 'videos';

const TABS: { key: GalleryTab; label: string; icon: typeof Images; type: 'image' | 'short' | 'video'; hint: string }[] = [
  { key: 'images', label: 'Images', icon: Images, type: 'image', hint: 'Photos from the gallery' },
  { key: 'shorts', label: 'Shorts', icon: Clapperboard, type: 'short', hint: 'Vertical clips' },
  { key: 'videos', label: 'Videos', icon: Video, type: 'video', hint: 'Landscape videos' },
];

const LIMIT = 24;
const EMPTY_GALLERY: GalleryMedia[] = [];

function asPhoto(item: GalleryMedia): GalleryPhoto {
  return {
    id: item.id,
    src: item.url,
    title: item.title || 'Gallery image',
    href: '/gallery?tab=images',
    excerpt: item.caption || undefined,
  };
}

function asClip(item: GalleryMedia): GalleryShort {
  return {
    id: item.id,
    title: item.title || (item.type === 'short' ? 'Short' : 'Video'),
    image: item.thumbnailUrl || undefined,
    embedUrl: item.url,
    rawUrl: item.url,
    href: `/gallery?tab=${item.type === 'short' ? 'shorts' : 'videos'}`,
    kind: 'video',
  };
}

function TileOverlay({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-2 text-left">
      {children}
    </span>
  );
}

function PlayBadge() {
  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/25">
        <Play size={13} className="translate-x-[1px] fill-current" />
      </span>
    </span>
  );
}

/** Hover-only cluster pinned to the top-right of every tile. */
const ACTION_REVEAL =
  'absolute right-1.5 top-1.5 z-10 flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100';

/** Same chip as MediaActions' badge variant, so the row of icons reads as one set. */
const CHIP = 'on-media grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 transition-colors hover:bg-black/70';

interface GalleryBoardProps {
  initialTab?: GalleryTab | 'photos' | 'stories';
}

export default function GalleryBoard({ initialTab = 'images' }: GalleryBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const startTab: GalleryTab = initialTab === 'shorts' || initialTab === 'videos' ? initialTab : 'images';
  const [tab, setTab] = useState<GalleryTab>(startTab);
  const [page, setPage] = useState(1);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [shortIndex, setShortIndex] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);
  const active = TABS.find((item) => item.key === tab)!;
  const activeQuery = useGalleryQuery({ type: active.type, page, limit: LIMIT });
  const imageCountQuery = useGalleryQuery({ type: 'image', page: 1, limit: 1 });
  const shortCountQuery = useGalleryQuery({ type: 'short', page: 1, limit: 1 });
  const videoCountQuery = useGalleryQuery({ type: 'video', page: 1, limit: 1 });
  const counts = {
    images: imageCountQuery.data?.total || 0,
    shorts: shortCountQuery.data?.total || 0,
    videos: videoCountQuery.data?.total || 0,
  };
  const items = activeQuery.data?.items ?? EMPTY_GALLERY;
  const total = activeQuery.data?.total || 0;
  const totalPages = Math.max(1, activeQuery.data?.totalPages || Math.ceil(total / LIMIT));
  const images = useMemo(() => (tab === 'images' ? items.map(asPhoto) : []), [items, tab]);
  const shorts = useMemo(() => (tab === 'shorts' ? items.map(asClip) : []), [items, tab]);
  const videos = useMemo(() => (tab === 'videos' ? items.map(asClip) : []), [items, tab]);
  const nextParams = { type: active.type, page: page + 1, limit: LIMIT };

  usePrefetchNextPage({
    page,
    totalPages,
    enabled: Boolean(activeQuery.data && !activeQuery.isPlaceholderData && activeQuery.isSuccess),
    queryKey: galleryKeys.list(nextParams),
    queryFn: (signal) => fetchGalleryPage(nextParams, signal),
  });

  const selectTab = useCallback((next: GalleryTab) => {
    setTab(next);
    setPage(1);
    setPhotoIndex(null);
    setShortIndex(null);
    setVideoIndex(null);
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  }, [pathname, router]);

  const closePhoto = useCallback(() => setPhotoIndex(null), []);
  const closeShort = useCallback(() => setShortIndex(null), []);
  const closeVideo = useCallback(() => setVideoIndex(null), []);

  const empty = images.length === 0 && shorts.length === 0 && videos.length === 0;

  return (
    <div className="space-y-5">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-accent">Media</p>
            <h1 className="mt-1 text-2xl font-semibold text-mtext">Gallery</h1>
            <p className="mt-1 max-w-2xl text-sm text-stext">
              Photos, shorts, and videos from around the cricket world.
            </p>
          </div>
          <p className="text-xs text-stext">
            <span className="font-semibold tabular-nums text-mtext">{total}</span>{' '}
            {active.label.toLowerCase()}
          </p>
        </div>
      </header>

      <PageToolbar>
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <Tabs
            tabs={TABS.map((item) => ({
              key: item.key,
              label: `${item.label} (${counts[item.key]})`,
            }))}
            active={tab}
            onChange={(next) => selectTab(next as GalleryTab)}
          />
        </div>
      </PageToolbar>

      <p className="text-sm text-stext">
        {active.hint} · {total} {total === 1 ? 'item' : 'items'}
        {activeQuery.isFetching && !activeQuery.isPending ? ' · Updating…' : ''}
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-5">
          {activeQuery.isPending ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="aspect-square animate-pulse rounded-lg bg-[var(--color-skeleton)]" />
              ))}
            </div>
          ) : activeQuery.isError ? (
            <ErrorState message="Gallery is temporarily unavailable." onRetry={() => void activeQuery.refetch()} />
          ) : empty ? (
            <EmptyState
              icon={active.icon}
              title={`No ${tab} yet`}
              message="Items appear here after they are uploaded in Gallery."
            />
          ) : (
            <>
              {tab === 'images' && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((photo, index) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-lg bg-secondary ring-1 ring-lborder">
                  <button
                    type="button"
                    onClick={() => setPhotoIndex(index)}
                    className="block w-full"
                    aria-label={`Open ${photo.title}`}
                  >
                    <span className="relative block aspect-square">
                      <RemoteImage
                        src={photo.src}
                        alt={photo.title}
                        fill
                        sizes="160px"
                        fit="cover"
                        className="news-image"
                      />
                      <TileOverlay>
                        <span className="line-clamp-1 block text-[11px] font-semibold text-white">{photo.title}</span>
                      </TileOverlay>
                    </span>
                  </button>
                  <div className={ACTION_REVEAL}>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex(index)}
                      className={CHIP}
                      aria-label={`Open ${photo.title}`}
                      title={`Open ${photo.title}`}
                    >
                      <Expand size={12} aria-hidden />
                    </button>
                    <MediaActions
                      url={photo.src}
                      title={photo.title}
                      shareHref={`/gallery/${encodeURIComponent(photo.id)}`}
                      shareType="gallery"
                      shareId={photo.id}
                      variant="badge"
                      size="xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'shorts' && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shorts.map((short, index) => (
                <div key={short.id} className="group relative overflow-hidden rounded-lg bg-secondary ring-1 ring-lborder">
                  <button
                    type="button"
                    onClick={() => setShortIndex(index)}
                    className="block w-full"
                    aria-label={`Play ${short.title}`}
                  >
                    <span className="relative block aspect-[3/4]">
                      {short.image ? (
                        <RemoteImage src={short.image} alt={short.title} fill sizes="160px" fit="cover" className="news-image" />
                      ) : (
                        <span className="grid h-full place-items-center media-fallback" />
                      )}
                      <PlayBadge />
                      <TileOverlay>
                        <span className="line-clamp-1 block text-[11px] font-semibold text-white">{short.title}</span>
                      </TileOverlay>
                    </span>
                  </button>
                  <div className={ACTION_REVEAL}>
                    <MediaActions
                      url={short.rawUrl || short.embedUrl || short.image || ''}
                      title={short.title}
                      shareHref={`/gallery/${encodeURIComponent(short.id)}`}
                      shareType="gallery"
                      shareId={short.id}
                      variant="badge"
                      size="xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'videos' && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {videos.map((video, index) => (
                <div key={video.id} className="group relative overflow-hidden rounded-lg bg-card text-left ring-1 ring-lborder">
                  <button
                    type="button"
                    onClick={() => setVideoIndex(index)}
                    className="block w-full text-left"
                    aria-label={`Play ${video.title}`}
                  >
                    <span className="relative block aspect-video bg-secondary">
                      {video.image ? (
                        <RemoteImage src={video.image} alt={video.title} fill sizes="240px" fit="cover" className="news-image" />
                      ) : (
                        <span className="grid h-full place-items-center media-fallback" />
                      )}
                      <PlayBadge />
                    </span>
                    <span className="block px-2 py-1.5">
                      <span className="line-clamp-1 block text-xs font-semibold text-mtext">{video.title}</span>
                    </span>
                  </button>
                  <div className={ACTION_REVEAL}>
                    <MediaActions
                      url={video.rawUrl || video.embedUrl || video.image || ''}
                      title={video.title}
                      shareHref={`/gallery/${encodeURIComponent(video.id)}`}
                      shareType="gallery"
                      shareId={video.id}
                      variant="badge"
                      size="xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto space-y-4 pt-2">
            <AdSlot placement="gallery-bottom" />
            <Pagination
              className="mt-0"
              page={page}
              totalPages={totalPages}
              total={total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
        </div>
        <EditorialSidebar
          topPlacement={items.length >= 16 ? 'gallery-skyscraper' : 'gallery-sidebar'}
          bottomPlacement={items.length >= 18 ? 'gallery-sidebar' : undefined}
          variant="media"
        />
      </div>

      {photoIndex !== null && (
        <PhotoLightbox items={images} index={photoIndex} onClose={closePhoto} onIndexChange={setPhotoIndex} />
      )}
      {shortIndex !== null && (
        <ShortsViewer items={shorts} index={shortIndex} onClose={closeShort} onIndexChange={setShortIndex} />
      )}
      {videoIndex !== null && (
        <ShortsViewer items={videos} index={videoIndex} onClose={closeVideo} onIndexChange={setVideoIndex} layout="landscape" />
      )}
    </div>
  );
}
