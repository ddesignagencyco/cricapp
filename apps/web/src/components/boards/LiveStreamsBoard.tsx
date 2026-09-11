'use client';

import { useEffect, useState } from 'react';
import { Clock, Globe, Radio, Signal, User, Video } from 'lucide-react';
import Badge from '../Badge';
import LiveIndicator from '../LiveIndicator';
import AdSlot from '../AdSlot';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import { formatDate } from '../../utils/helpers';
import { fetchStreamsPage } from '../../services/streams';
import type { Stream } from '../../types/index';
import CommentsSection from '../CommentsSection';

function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] || null;
}

function buildEmbedUrl(stream: Stream): string | null {
  const raw = stream.embedUrl || (stream as { streamUrl?: string }).streamUrl || '';
  if (!raw || raw === '#') return null;
  const id = stream.embedId;
  if (stream.embedType === 'youtube' || /youtube\.com|youtu\.be/.test(raw)) {
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
    const extracted = youtubeId(raw);
    if (extracted) return `https://www.youtube.com/embed/${extracted}?autoplay=1`;
    if (raw.includes('/embed/')) return raw;
  }
  if (stream.embedType === 'twitch' && id) {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `https://player.twitch.tv/?channel=${id}&parent=${parent}`;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return null;
}

const TABS = [
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ended', label: 'Ended' },
];

export default function LiveStreamsBoard() {
  const [status, setStatus] = useState('live');
  const [page, setPage] = useState(1);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchStreamsPage({ status, page, limit: 20 })
      .then((res) => {
        if (cancelled) return;
        setStreams(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setLoading(false);
        setActiveId((current) => current && res.items.some((s) => s.id === current) ? current : res.items[0]?.id || null);
      })
      .catch(() => {
        if (cancelled) return;
        setStreams([]);
        setTotal(0);
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, retryKey]);

  const featured = streams.find((s) => s.id === activeId) || streams[0] || null;

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Video size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">Live Streaming</span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Live Streams</h1>
        <p className="mt-2 max-w-2xl text-sm text-stext">
          Watch cricket streams published by the editorial team. Playback is embedded from the source URL returned by the API.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatus(tab.key);
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              status === tab.key ? 'btn-brand' : 'border border-lborder bg-card text-stext hover:text-mtext'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-md border border-lborder bg-card" />
      ) : error ? (
        <ErrorState message="Streams are temporarily unavailable." onRetry={() => setRetryKey((k) => k + 1)} />
      ) : !featured ? (
        <EmptyState
          title={`No ${status} streams`}
          message="Streams appear here when an administrator publishes a stream URL."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <StreamPlayer stream={featured} />
            <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
              <div className="flex flex-wrap items-center gap-2">
                {featured.status === 'live' ? <LiveIndicator label="LIVE" /> : <Badge tone="neutral">{featured.status}</Badge>}
                {featured.host && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-mtext">
                    <User size={13} className="text-accent" /> {featured.host}
                  </span>
                )}
                {featured.startedAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-stext">
                    <Clock size={13} /> {formatDate(featured.startedAt)}
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-lg font-bold text-mtext">{featured.title}</h2>
            </div>
            <CommentsSection targetType="stream" targetId={featured.id} />
            <AdSlot slot="streams-below-player" format="leaderboard" />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-stext">{total} stream{total === 1 ? '' : 's'}</h3>
              <div className="space-y-2">
                {streams.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={`w-full rounded-xl p-3 text-left ring-1 transition-all ${
                      s.id === featured.id ? 'bg-accent/10 ring-accent/40' : 'bg-elevated ring-transparent hover:ring-lborder'
                    }`}
                  >
                    <span className="truncate text-sm font-semibold text-mtext">{s.shortTitle || s.title}</span>
                    <p className="mt-0.5 line-clamp-1 text-xs text-stext">{s.host || s.status}</p>
                  </button>
                ))}
              </div>
            </div>
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function StreamPlayer({ stream }: { stream: Stream }) {
  const embed = buildEmbedUrl(stream);
  return (
    <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-lborder">
      <div className="relative aspect-video w-full">
        {embed ? (
          <iframe
            src={embed}
            title={stream.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div
            className={`relative flex h-full w-full flex-col items-center justify-center bg-cover bg-center ${stream.image ? '' : 'bg-gradient-to-br from-cyan-700 to-blue-900'}`}
            style={stream.image ? { backgroundImage: `url(${stream.image})` } : undefined}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-black/40 ring-4 ring-accent/40">
                <Radio size={34} className="text-accent" />
              </div>
              <p className="mt-3 text-sm font-bold uppercase tracking-widest text-white/80">
                Stream URL is not embeddable
              </p>
            </div>
            {stream.status === 'live' && (
              <div className="absolute left-4 top-4 z-10">
                <LiveIndicator label="LIVE" />
              </div>
            )}
            <div className="absolute inset-x-4 bottom-4 z-10 flex items-center justify-between text-xs font-semibold text-white/70">
              <span className="flex items-center gap-1.5"><Signal size={12} /> Source unavailable</span>
              <span className="flex items-center gap-1.5"><Globe size={12} /> {stream.host || 'External'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
