'use client';

import { useCallback, useMemo, useState } from 'react';
import { Clapperboard, Expand, Images, Play, Sparkles, Video } from 'lucide-react';
import RemoteImage from '../RemoteImage';
import NewsCopy from '../NewsCopy';
import EmptyState from '../EmptyState';
import StoryViewer from '../gallery/StoryViewer';
import PhotoLightbox from '../gallery/PhotoLightbox';
import ShortsViewer from '../gallery/ShortsViewer';
import type { GalleryPhoto, GalleryShort } from '../gallery/galleryTypes';

export type GalleryTab = 'images' | 'shorts' | 'videos' | 'stories';

const TABS: { key: GalleryTab; label: string; icon: typeof Images; hint: string }[] = [
  { key: 'images', label: 'Images', icon: Images, hint: 'Photos from the newsroom' },
  { key: 'shorts', label: 'Shorts', icon: Clapperboard, hint: 'Vertical clips' },
  { key: 'videos', label: 'Videos', icon: Video, hint: 'Full length streams' },
  { key: 'stories', label: 'Stories', icon: Sparkles, hint: 'Tap through highlights' },
];

const SEEN_KEY = 'pcz-gallery-stories-seen';

function readSeen(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-80)));
}

function TileOverlay({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 text-left">
      {children}
    </span>
  );
}

function PlayBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12';
  return (
    <span className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className={`grid ${box} place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110`}>
        <Play size={size === 'sm' ? 15 : 19} className="translate-x-[1px] fill-current" />
      </span>
    </span>
  );
}

interface GalleryBoardProps {
  images: GalleryPhoto[];
  shorts: GalleryShort[];
  videos: GalleryShort[];
  stories: GalleryPhoto[];
  initialTab?: GalleryTab | 'photos';
}

export default function GalleryBoard({
  images,
  shorts,
  videos,
  stories,
  initialTab = 'images',
}: GalleryBoardProps) {
  const startTab = initialTab === 'photos' ? 'images' : initialTab;
  const [tab, setTab] = useState<GalleryTab>(TABS.some((item) => item.key === startTab) ? startTab : 'images');
  const [seen, setSeen] = useState<string[]>(readSeen);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [shortIndex, setShortIndex] = useState<number | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);

  const markSeen = useCallback((id: string) => {
    setSeen((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      writeSeen(next);
      return next;
    });
  }, []);

  const openStory = useCallback((index: number) => {
    const item = stories[index];
    if (item) markSeen(item.id);
    setStoryIndex(index);
  }, [markSeen, stories]);

  const closeStory = useCallback(() => setStoryIndex(null), []);
  const closePhoto = useCallback(() => setPhotoIndex(null), []);
  const closeShort = useCallback(() => setShortIndex(null), []);
  const closeVideo = useCallback(() => setVideoIndex(null), []);
  const changeStory = useCallback((next: number) => {
    const item = stories[next];
    if (item) markSeen(item.id);
    setStoryIndex(next);
  }, [markSeen, stories]);

  const counts = useMemo(() => ({
    images: images.length,
    shorts: shorts.length,
    videos: videos.length,
    stories: stories.length,
  }), [images.length, shorts.length, videos.length, stories.length]);

  const activeTab = TABS.find((item) => item.key === tab);
  const activeCount = counts[tab];

  return (
    <div className="space-y-7">
      <header className="relative overflow-hidden rounded-3xl border border-lborder bg-card">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              <Images size={12} />
              Media library
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-mtext sm:text-4xl">Gallery</h1>
            <p className="mt-2 text-sm leading-relaxed text-stext">
              Match photography, vertical shorts, full match videos and tap-through stories — all in one place.
            </p>
          </div>
          <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-lborder bg-lborder text-center lg:w-[420px]">
            {TABS.map((item) => (
              <div key={item.key} className="bg-secondary px-2 py-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-stext">{item.label}</dt>
                <dd className="mt-0.5 text-xl font-black tabular-nums text-mtext">{counts[item.key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="sticky top-0 z-10 -mx-4 border-b border-lborder bg-primary/90 px-4 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Gallery media types">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.key)}
                className={`relative flex shrink-0 items-center gap-2 px-3.5 py-3 text-sm font-semibold transition-colors sm:px-4 ${
                  active ? 'text-mtext' : 'text-stext hover:text-mtext'
                }`}
              >
                <Icon size={15} className={active ? 'text-accent' : ''} />
                {item.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  active ? 'bg-accent/15 text-accent' : 'bg-secondary text-stext'
                }`}>
                  {counts[item.key]}
                </span>
                <span className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-opacity ${
                  active ? 'bg-accent opacity-100' : 'opacity-0'
                }`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xs text-stext">{activeTab?.hint}</p>
        <p className="text-xs tabular-nums text-stext">{activeCount} {activeCount === 1 ? 'item' : 'items'}</p>
      </div>

      {tab === 'images' && (
        images.length === 0 ? (
          <EmptyState icon={Images} title="No images yet" message="Cover photos from published articles appear in this tab." />
        ) : (
          <div className="fade-in columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
            {images.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setPhotoIndex(index)}
                className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl bg-secondary ring-1 ring-lborder transition-shadow hover:ring-accent/40"
              >
                <RemoteImage
                  src={photo.src}
                  alt={photo.title}
                  width={640}
                  height={480}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  fit="contain"
                  className="news-image h-auto w-full transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <span className="pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-white opacity-0 ring-1 ring-white/20 transition-opacity group-hover:opacity-100">
                  <Expand size={13} />
                </span>
                <TileOverlay>
                  <NewsCopy as="span" language={photo.language} text={photo.title} className="line-clamp-2 block text-xs font-semibold text-white">
                    {photo.title}
                  </NewsCopy>
                  {photo.date && <span className="mt-0.5 block text-[10px] text-white/70">{photo.date}</span>}
                </TileOverlay>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'shorts' && (
        shorts.length === 0 ? (
          <EmptyState icon={Clapperboard} title="No shorts yet" message="YouTube Shorts and vertical clips show here." />
        ) : (
          <div className="fade-in grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {shorts.map((short, index) => (
              <button
                key={short.id}
                type="button"
                onClick={() => setShortIndex(index)}
                className="group relative overflow-hidden rounded-2xl bg-secondary ring-1 ring-lborder transition-shadow hover:ring-accent/40"
              >
                <span className="relative block aspect-[9/16]">
                  {short.image ? (
                    <RemoteImage
                      src={short.image}
                      alt={short.title}
                      fill
                      sizes="220px"
                      fit="contain"
                      className="news-image transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center media-fallback" />
                  )}
                  <PlayBadge size="sm" />
                  <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/15">
                    Short
                  </span>
                  <TileOverlay>
                    <span className="line-clamp-2 block text-xs font-semibold text-white">{short.title}</span>
                  </TileOverlay>
                </span>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'videos' && (
        videos.length === 0 ? (
          <EmptyState icon={Video} title="No videos yet" message="Full streams and landscape videos appear here after they are published." />
        ) : (
          <div className="fade-in grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, index) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setVideoIndex(index)}
                className="group overflow-hidden rounded-2xl bg-card text-left ring-1 ring-lborder transition-shadow hover:ring-accent/40"
              >
                <span className="relative block aspect-video bg-secondary">
                  {video.image ? (
                    <RemoteImage
                      src={video.image}
                      alt={video.title}
                      fill
                      sizes="420px"
                      fit="contain"
                      className="news-image transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="grid h-full place-items-center media-fallback" />
                  )}
                  <PlayBadge />
                  {video.status && (
                    <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/15">
                      {video.status}
                    </span>
                  )}
                </span>
                <span className="block p-3.5">
                  <span className="line-clamp-2 block text-sm font-semibold text-mtext transition-colors group-hover:text-accent">
                    {video.title}
                  </span>
                  <span className="mt-1 block text-[11px] text-stext">Tap to play</span>
                </span>
              </button>
            ))}
          </div>
        )
      )}

      {tab === 'stories' && (
        stories.length === 0 ? (
          <EmptyState icon={Sparkles} title="No stories yet" message="Illustrated articles become tap-through stories in this tab." />
        ) : (
          <div className="fade-in space-y-6">
            <div className="rounded-2xl border border-lborder bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-stext">Latest stories</p>
                <button type="button" onClick={() => openStory(0)} className="text-xs font-bold text-accent hover:underline">
                  Play all
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar">
                {stories.map((story, index) => {
                  const viewed = seen.includes(story.id);
                  return (
                    <button key={story.id} type="button" onClick={() => openStory(index)} className="w-[74px] shrink-0 text-center">
                      <span className={`mx-auto grid h-[70px] w-[70px] place-items-center rounded-full p-[2.5px] transition-transform hover:scale-105 ${
                        viewed ? 'bg-lborder' : 'bg-gradient-to-br from-accent via-[var(--color-brand)] to-accent'
                      }`}>
                        <span className="relative block h-full w-full overflow-hidden rounded-full bg-secondary ring-2 ring-card">
                          <RemoteImage src={story.src} alt="" fill sizes="70px" fit="contain" className="news-image" />
                        </span>
                      </span>
                      <NewsCopy as="span" language={story.language} text={story.title} className="mt-1.5 block truncate text-[11px] font-medium text-stext">
                        {story.title}
                      </NewsCopy>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {stories.map((story, index) => (
                <button
                  key={`card-${story.id}`}
                  type="button"
                  onClick={() => openStory(index)}
                  className="group relative overflow-hidden rounded-2xl bg-secondary ring-1 ring-lborder transition-shadow hover:ring-accent/40"
                >
                  <span className="relative block aspect-[3/4]">
                    <RemoteImage
                      src={story.src}
                      alt={story.title}
                      fill
                      sizes="240px"
                      fit="contain"
                      className="news-image transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    {!seen.includes(story.id) && (
                      <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        New
                      </span>
                    )}
                    <TileOverlay>
                      <NewsCopy as="span" language={story.language} text={story.title} className="line-clamp-2 block text-xs font-semibold text-white">
                        {story.title}
                      </NewsCopy>
                    </TileOverlay>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {storyIndex !== null && (
        <StoryViewer items={stories} index={storyIndex} onClose={closeStory} onIndexChange={changeStory} />
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
