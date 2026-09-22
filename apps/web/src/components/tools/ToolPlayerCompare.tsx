'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { fetchPlayerById, fetchPlayers } from '../../services/players';
import type { Player } from '../../types';
import type { ToolDef } from '../../lib/toolsCatalog';
import { MoreTools, ToolIntro } from './ToolShared';

const SEARCH_DEBOUNCE_MS = 400;

function displayName(player: Player | null): string {
  if (!player) return '';
  return String(player.fullName || player.name || player.shortName || player.id);
}

function playerKey(player: Player): string {
  return String(player.id || player.fullName || player.name);
}

function PlayerPick({
  label,
  selected,
  onPick,
}: {
  label: string;
  selected: Player | null;
  onPick: (_player: Player | null) => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      requestRef.current += 1;
      setHits([]);
      setSearching(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const handle = window.setTimeout(() => {
      setSearching(true);
      fetchPlayers({ q: query, limit: 8 })
        .then((rows) => {
          if (requestRef.current !== requestId) return;
          setHits(rows);
        })
        .catch(() => {
          if (requestRef.current !== requestId) return;
          setHits([]);
        })
        .finally(() => {
          if (requestRef.current === requestId) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [q]);

  const showList = q.trim().length >= 2 && !searching && hits.length > 0;

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stext">{label}</p>
      {selected ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-lborder bg-secondary px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-mtext">{displayName(selected)}</p>
            <p className="truncate text-[11px] text-stext">
              {[selected.role, selected.nationality || selected.country].filter(Boolean).join(' · ') || 'Selected'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onPick(null);
              setQ('');
              setHits([]);
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-stext hover:bg-elevated hover:text-mtext"
            aria-label={`Clear ${label}`}
          >
            <X size={14} />
          </button>
        </div>
      ) : null}
      <input
        value={q}
        onChange={(event) => setQ(event.target.value.slice(0, 80))}
        placeholder={selected ? 'Search to replace' : 'Search stored players'}
        className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
      />
      {q.trim().length >= 2 && searching ? (
        <p className="mt-1.5 text-[11px] font-semibold text-stext">Searching…</p>
      ) : null}
      {showList ? (
        <ul className="mt-1 overflow-hidden rounded-md border border-lborder bg-elevated">
          {hits.map((player) => (
            <li key={playerKey(player)}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[var(--color-row-hover)]"
                onClick={() => {
                  onPick(player);
                  setQ('');
                  setHits([]);
                }}
              >
                <span className="font-semibold text-mtext">{displayName(player)}</span>
                <span className="text-xs text-stext">
                  {[player.role, player.nationality || player.country].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-lborder bg-secondary px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="mt-1 text-sm font-semibold text-mtext">{value || '—'}</p>
    </div>
  );
}

function PlayerCard({ player }: { player: Player | null }) {
  if (!player) {
    return <p className="text-sm text-stext">Pick a player.</p>;
  }
  return (
    <>
      <h2 className="text-lg font-black text-mtext">{displayName(player)}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Fact label="Role" value={String(player.role || '')} />
        <Fact label="Nation" value={String(player.nationality || player.country || '')} />
        <Fact label="Batting" value={String(player.battingStyle || '')} />
        <Fact label="Bowling" value={String(player.bowlingStyle || '')} />
        <Fact label="Born" value={String(player.birth || '')} />
        <Fact label="Recent matches" value={String(player.recentMatches?.length ?? 0)} />
      </div>
      <Link href={`/players/${player.id}`} className="mt-3 inline-block text-xs font-semibold text-accent">
        Open profile
      </Link>
    </>
  );
}

function usePlayerDetails(picked: Player | null): Player | null {
  const [full, setFull] = useState<Player | null>(null);

  useEffect(() => {
    if (!picked?.id) {
      setFull(null);
      return;
    }
    setFull(picked);
    let cancelled = false;
    fetchPlayerById(String(picked.id))
      .then((row) => {
        if (!cancelled && row) setFull(row);
      })
      .catch(() => {
        if (!cancelled) setFull(picked);
      });
    return () => {
      cancelled = true;
    };
  }, [picked]);

  return full;
}

export default function ToolPlayerCompare({ tool }: { tool: ToolDef }) {
  const [left, setLeft] = useState<Player | null>(null);
  const [right, setRight] = useState<Player | null>(null);
  const leftFull = usePlayerDetails(left);
  const rightFull = usePlayerDetails(right);

  return (
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <p className="text-xs text-stext">
        Compares stored directory fields and recent matches. Career aggregates (runs, wickets, averages) need a player-stats API — we do not invent those numbers.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PlayerPick label="Player A" selected={left} onPick={setLeft} />
        <PlayerPick label="Player B" selected={right} onPick={setRight} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-lborder bg-card p-4">
          <PlayerCard player={leftFull} />
        </div>
        <div className="rounded-md border border-lborder bg-card p-4">
          <PlayerCard player={rightFull} />
        </div>
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
