import Link from 'next/link';
import { Play, Radio } from 'lucide-react';
import RemoteImage from './RemoteImage';
import SectionHeader from './SectionHeader';
import type { Stream } from '../types/index';

/**
 * Homepage "Watch Now" rail. A single live stream gets a wide featured card
 * (it used to sit alone in a third of the row with an empty band beside it);
 * two or three share an even grid. Thumbnails cover the 16:9 frame, which crops
 * the black letterbox bars YouTube bakes into its `hqdefault` images.
 */
export default function WatchNowSection({ streams }: { streams: Stream[] }) {
  if (streams.length === 0) return null;
  const items = streams.slice(0, 3);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <SectionHeader title="Watch Now" subtitle="Live right now" icon="video" to="/streams" actionLabel="All streams" />
      {items.length === 1 ? (
        <FeaturedStream stream={items[0]} />
      ) : (
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${items.length === 3 ? 'lg:grid-cols-3' : ''}`}>
          {items.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}
    </section>
  );
}

function LivePill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white motion-reduce:animate-none" aria-hidden="true" />
      Live
    </span>
  );
}

function Thumbnail({ stream, sizes }: { stream: Stream; sizes: string }) {
  return (
    <div className="relative aspect-video overflow-hidden bg-[var(--color-skeleton)]">
      {stream.image ? (
        <RemoteImage
          src={stream.image}
          alt=""
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      ) : (
        <div className="media-fallback grid h-full place-items-center text-stext">
          <Radio size={28} aria-hidden="true" />
        </div>
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden="true" />
      <span className="absolute left-3 top-3">
        <LivePill />
      </span>
      <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-[var(--color-brand)] shadow-lg transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none">
          <Play size={20} className="ml-0.5 fill-current" />
        </span>
      </span>
    </div>
  );
}

function FeaturedStream({ stream }: { stream: Stream }) {
  return (
    <Link
      href="/streams"
      className="card-interactive group grid overflow-hidden rounded-xl border border-lborder bg-card md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
    >
      <Thumbnail stream={stream} sizes="(min-width: 768px) 640px, 100vw" />
      <div className="flex flex-col justify-center gap-3 p-5 sm:p-6 lg:p-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-danger">
          <Radio size={14} aria-hidden="true" />
          Streaming now
        </p>
        <h3 className="line-clamp-3 text-lg font-bold leading-snug text-mtext group-hover:text-accent sm:text-xl">
          {stream.title}
        </h3>
        <span className="btn-brand mt-1 inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold">
          <Play size={15} className="fill-current" aria-hidden="true" />
          Watch live
        </span>
      </div>
    </Link>
  );
}

function StreamCard({ stream }: { stream: Stream }) {
  return (
    <Link
      href="/streams"
      className="card-interactive group flex flex-col overflow-hidden rounded-xl border border-lborder bg-card"
    >
      <Thumbnail stream={stream} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
      <div className="p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-mtext group-hover:text-accent">
          {stream.title}
        </h3>
      </div>
    </Link>
  );
}
