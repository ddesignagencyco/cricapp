'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Clapperboard, Expand, Images, Play, Video } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-stext">Media</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext">Gallery</h1>
          <p className="mt-1 max-w-xl text-sm text-stext">Photos, shorts, and videos.</p>
        </header>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Gallery media types">
          {TABS.map((item) => {
            const Icon = item.icon;
            const selected = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(item.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                  selected ? 'btn-brand' : 'border border-lborder bg-card text-stext hover:text-mtext'
                }`}
              >
                <Icon size={14} />
                {item.label}
                <span className="tabular-nums opacity-80">{counts[item.key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-stext">
        {active.hint} · {total} {total === 1 ? 'item' : 'items'}
        {activeQuery.isFetching && !activeQuery.isPending ? ' · Updating…' : ''}
      </p>

      {activeQuery.isPending ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
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
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {images.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  className="group relative overflow-hidden rounded-lg bg-secondary ring-1 ring-lborder"
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
                    <span className="pointer-events-none absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20">
                      <Expand size={11} />
                    </span>
                    <TileOverlay>
                      <span className="line-clamp-1 block text-[11px] font-semibold text-white">{photo.title}</span>
                    </TileOverlay>
                  </span>
                </button>
              ))}
            </div>
          )}

          {tab === 'shorts' && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {shorts.map((short, index) => (
                <button
                  key={short.id}
                  type="button"
                  onClick={() => setShortIndex(index)}
                  className="group relative overflow-hidden rounded-lg bg-secondary ring-1 ring-lborder"
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
              ))}
            </div>
          )}

          {tab === 'videos' && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {videos.map((video, index) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setVideoIndex(index)}
                  className="group overflow-hidden rounded-lg bg-card text-left ring-1 ring-lborder"
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
              ))}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={setPage}
          />
        </>
      )}

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
