'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchPlayerById, fetchPlayers } from '../../services/players';
import type { Player } from '../../types';
import type { ToolDef } from '../../lib/toolsCatalog';
import { MoreTools, ToolIntro } from './ToolShared';

function displayName(player: Player | null): string {
  if (!player) return '';
  return String(player.fullName || player.name || player.shortName || player.id);
}

function PlayerPick({
  label,
  onPick,
}: {
  label: string;
  onPick: (_player: Player | null) => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Player[]>([]);
  const [chosen, setChosen] = useState<Player | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      return;
    }
    const handle = window.setTimeout(() => {
      fetchPlayers({ q: query, limit: 8 })
        .then(setHits)
        .catch(() => setHits([]));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [q]);

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <input
        value={chosen ? displayName(chosen) : q}
        onChange={(event) => {
          setChosen(null);
          onPick(null);
          setQ(event.target.value);
        }}
        placeholder="Search stored players"
        className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
      />
      {!chosen && hits.length > 0 && (
        <ul className="mt-1 overflow-hidden rounded-md border border-lborder bg-elevated">
          {hits.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-[var(--color-row-hover)]"
                onClick={() => {
                  setChosen(player);
                  setQ('');
                  setHits([]);
                  onPick(player);
                }}
              >
                <span className="font-semibold text-mtext">{displayName(player)}</span>
                <span className="text-xs text-stext">{[player.role, player.nationality || player.country].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
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

export default function ToolPlayerCompare({ tool }: { tool: ToolDef }) {
  const [left, setLeft] = useState<Player | null>(null);
  const [right, setRight] = useState<Player | null>(null);
  const [leftFull, setLeftFull] = useState<Player | null>(null);
  const [rightFull, setRightFull] = useState<Player | null>(null);

  useEffect(() => {
    if (!left?.id) {
      setLeftFull(null);
      return;
    }
    fetchPlayerById(String(left.id)).then(setLeftFull).catch(() => setLeftFull(left));
  }, [left]);

  useEffect(() => {
    if (!right?.id) {
      setRightFull(null);
      return;
    }
    fetchPlayerById(String(right.id)).then(setRightFull).catch(() => setRightFull(right));
  }, [right]);

  const pair = [leftFull, rightFull] as const;

  return (
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <p className="text-xs text-stext">
        Compares stored directory fields and recent matches. Career aggregates (runs, wickets, averages) need a player-stats API — we do not invent those numbers.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PlayerPick label="Player A" onPick={setLeft} />
        <PlayerPick label="Player B" onPick={setRight} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {pair.map((player, index) => (
          <div key={player?.id || `empty-${index}`} className="rounded-md border border-lborder bg-card p-4">
            {player ? (
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
            ) : (
              <p className="text-sm text-stext">Pick a player.</p>
            )}
          </div>
        ))}
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
