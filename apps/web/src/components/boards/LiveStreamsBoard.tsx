'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Activity, Clock, Eye, Globe, Radio, Signal, Star, ThumbsUp, User, Video, Zap,
} from 'lucide-react';
import Badge from '../Badge';
import LiveIndicator from '../LiveIndicator';
import AdBanner from '../AdBanner';
import EmptyState from '../EmptyState';
import { formatDate } from '../../utils/helpers';

function buildEmbedUrl(stream: any) {
  const id = stream.embedId;
  if (stream.embedUrl && stream.embedUrl !== '#' && !stream.embedUrl.startsWith('http')) {
    return null;
  }
  switch (stream.embedType) {
    case 'youtube':
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1`;
      if (stream.embedUrl && stream.embedUrl.includes('youtube.com/embed/')) return stream.embedUrl;
      return null;
    case 'twitch':
      if (id) return `https://player.twitch.tv/?channel=${id}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`;
      return null;
    case 'mux':
      return stream.embedUrl || null;
    default:
      return stream.embedUrl && stream.embedUrl !== '#' ? stream.embedUrl : null;
  }
}

interface Props {
  streams: any[];
}

export default function LiveStreamsBoard({ streams }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewerMap, setViewerMap] = useState<Record<string, number>>({});
  const [chat, setChat] = useState<any[]>([]);

  const live = (streams || []).filter((s) => s.status === 'live');
  const searchable = live.length > 0 ? live : streams || [];
  const featured = searchable.find((s) => s.id === activeId) || searchable[0] || null;
  const featuredId = featured ? featured.id : null;
  const prevFeaturedId = useRef(featuredId);

  if (prevFeaturedId.current !== featuredId) {
    prevFeaturedId.current = featuredId;
    if (featuredId && featured) {
      setViewerMap({ [featuredId]: featured.viewers || 0 });
      setChat(featured.chatSample || []);
    }
  }

  useEffect(() => {
    if (!featuredId) return;
    const tick = setInterval(() => {
      setViewerMap((m) => ({
        ...m,
        [featuredId]: Math.max(0, Math.round((m[featuredId] ?? 0) + (Math.random() * 8 - 2))),
      }));
    }, 2500);
    return () => clearInterval(tick);
     
  }, [featuredId]);

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Video size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Live Streaming
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Live Streams</h1>
        <p className="mt-2 max-w-2xl text-sm text-stext">
          Watch every ball with our expert panel. Streams are embedded and offloaded to a
          CDN-grade video platform so thousands of fans can watch without the website going down.
        </p>
      </header>

      {!featured ? (
        <EmptyState
          title="No streams right now"
          message="Live streams will appear here as soon as they go on air."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <StreamPlayer stream={featured} viewers={viewerMap[featured.id] ?? featured.viewers} />

            <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <LiveIndicator label="LIVE" />
                    <Badge tone="neutral">{featured.language}</Badge>
                    <Badge tone="gold">{featured.quality}</Badge>
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-mtext">{featured.title}</h2>
                  <p className="mt-1 text-sm text-stext">{featured.description}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {featured.host && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-mtext">
                    <User size={13} className="text-accent" /> {featured.host}
                  </span>
                )}
                {featured.coHost && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-mtext">
                    <Star size={13} className="text-gold" /> {featured.coHost}
                  </span>
                )}
                {featured.startedAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-stext">
                    <Clock size={13} /> {formatDate(featured.startedAt)}
                  </span>
                )}
                {featured.tags?.map((t: string) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-elevated px-3 py-1.5 text-xs font-semibold text-stext">
                    <Zap size={12} /> {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
              <AdBanner variant="horizontal" />
            </div>
          </div>

          <div className="space-y-4">
            <StreamList
              streams={live}
              featuredId={featured.id}
              viewerMap={viewerMap}
              onSelect={(id: string) => setActiveId(id)}
            />
            <LiveChat chat={chat} />
          </div>
        </div>
      )}
    </>
  );
}

function StreamPlayer({ stream, viewers }: { stream: any; viewers: number }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-lborder">
      <div className="relative aspect-video w-full">
        {buildEmbedUrl(stream) ? (
          <iframe
            src={buildEmbedUrl(stream)!}
            title={stream.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div
            className={`relative flex h-full w-full flex-col items-center justify-center bg-cover bg-center ${stream.image ? '' : `bg-gradient-to-br ${stream.theme || 'from-cyan-700 to-blue-900'}`}`}
            style={stream.image ? { backgroundImage: `url(${stream.image})` } : undefined}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-black/40 ring-4 ring-accent/40">
                <Radio size={34} className="text-accent" />
              </div>
              <p className="mt-3 text-sm font-bold uppercase tracking-widest text-white/80">
                {stream.shortTitle || stream.title}
              </p>
            </div>
            <div className="absolute left-4 top-4 z-10">
              <LiveIndicator label="LIVE" />
            </div>
            <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
              <Eye size={13} className="text-accent2" />
              {viewers !== null && viewers !== undefined ? viewers.toLocaleString() : 0}
            </div>
            <div className="absolute inset-x-4 bottom-4 z-10 flex items-center justify-between text-[11px] font-semibold text-white/70">
              <span className="flex items-center gap-1.5"><Signal size={12} /> Stable feed</span>
              <span className="flex items-center gap-1.5"><Globe size={12} /> {stream.language}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StreamList({ streams, featuredId, viewerMap, onSelect }: { streams: any[]; featuredId: string; viewerMap: Record<string, number>; onSelect: (id: string) => void }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
      <div className="mb-3 flex items-center gap-2">
        <Activity size={15} className="text-accent" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-stext">
          On Air Now
        </h3>
      </div>
      {streams.length === 0 ? (
        <p className="text-sm text-stext">No streams currently live.</p>
      ) : (
        <div className="space-y-2">
          {streams.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`w-full rounded-xl p-3 text-left ring-1 transition-all ${
                s.id === featuredId
                  ? 'bg-accent/10 ring-accent/40'
                  : 'bg-elevated ring-transparent hover:ring-lborder'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-mtext">{s.shortTitle}</span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-accent2">
                  <Eye size={12} />
                  {(viewerMap[s.id] ?? s.viewers ?? 0).toLocaleString()}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] text-stext">{s.host || s.title}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveChat({ chat }: { chat: any[] }) {
  const messages = chat || [];
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
      <div className="flex items-center justify-between border-b border-lborder px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-accent" />
          <h3 className="text-sm font-bold text-mtext">Live Chat</h3>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-stext">
          <ThumbsUp size={12} /> {messages.length}
        </span>
      </div>
      <div className="h-64 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((m: any, i: number) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-bold text-accent">
              {m.user.slice(0, 2).toUpperCase()}
            </span>
            <p className="min-w-0 flex-1 text-[13px] leading-snug">
              <span className="font-semibold text-mtext">{m.user}</span>{' '}
              <span className="text-mtext/90">{m.text}</span>
            </p>
            <span className="shrink-0 text-[10px] text-stext">{m.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
