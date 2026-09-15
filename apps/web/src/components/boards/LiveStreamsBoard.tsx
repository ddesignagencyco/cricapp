'use client';

import { useEffect, useState } from 'react';
import { Clock, Globe, Radio, Signal, User } from 'lucide-react';
import { StatusBadge } from '../Badge';
import LiveIndicator from '../LiveIndicator';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import { formatDate } from '../../utils/helpers';
import { fetchStreamsPage } from '../../services/streams';
import type { Stream } from '../../types/index';
import CommentsSection from '../CommentsSection';
import { StreamsBodySkeleton } from '../skeletons/Skeletons';
import { toPlayerEmbedUrl } from '../../utils/streamEmbed';
import RemoteImage from '../RemoteImage';

function buildEmbedUrl(stream: Stream): string | null {
  const raw = stream.embedUrl || (stream as { streamUrl?: string }).streamUrl || '';
  if (!raw || raw === '#') return null;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (stream.embedType === 'twitch' && stream.embedId) {
    return `https://player.twitch.tv/?channel=${stream.embedId}&parent=${hostname}`;
  }
  return toPlayerEmbedUrl(raw, { autoplay: true, hostname });
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
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stext">Live streaming</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext">Streams</h1>
          <p className="mt-1 max-w-xl text-sm text-stext">
            Watch streams published by the newsroom.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
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
      </header>

      {loading ? (
        <StreamsBodySkeleton />
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
                {featured.status === 'live' ? <LiveIndicator /> : <StatusBadge status={featured.status} />}
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
              <h2 className="mt-2 text-lg font-bold leading-snug text-mtext">{featured.title}</h2>
            </div>
            <CommentsSection targetType="stream" targetId={featured.id} />
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
                    className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left ring-1 transition-all ${
                      s.id === featured.id ? 'bg-accent/10 ring-accent/40' : 'bg-elevated ring-transparent hover:ring-lborder'
                    }`}
                  >
                    <span className="relative h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-secondary">
                      {s.image ? (
                        <RemoteImage src={s.image} alt="" fill sizes="72px" className="object-cover" />
                      ) : (
                        <span className="grid h-full w-full place-items-center text-stext">
                          <Radio size={14} />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug text-mtext">{s.shortTitle || s.title}</span>
                      <p className="mt-0.5 truncate text-xs text-stext">{s.host || s.status}</p>
                    </span>
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
            className={`relative flex h-full w-full flex-col items-center justify-center bg-cover bg-center ${stream.image ? '' : 'media-fallback'}`}
            style={stream.image ? { backgroundImage: `url(${stream.image})` } : undefined}
          >
            {stream.image && (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07111F]/70 via-transparent to-[#07111F]/40" />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[#07111F]/50 ring-2 ring-accent/40">
                <Radio size={34} className="text-accent" />
              </div>
              <p className="mt-3 text-sm font-bold uppercase tracking-widest text-white/80">
                Stream URL is not embeddable
              </p>
            </div>
            {stream.status === 'live' && (
              <div className="absolute left-4 top-4 z-10">
                <LiveIndicator />
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
