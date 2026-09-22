'use client';

import { useEffect, useState } from 'react';
import MatchOddsView from '../odds/MatchOddsView';
import { matchSides } from '../../lib/predictions';
import type { ToolDef } from '../../lib/toolsCatalog';
import { fetchMatchById } from '../../services/matches';
import { MoreTools, ToolIntro } from './ToolShared';

const EXAMPLE_MATCH_ID = 'sr:match:67132180';

export default function ToolOddsMatch({ tool }: { tool: ToolDef }) {
  const [input, setInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [homeLabel, setHomeLabel] = useState('Home');
  const [awayLabel, setAwayLabel] = useState('Away');

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    void fetchMatchById(activeId)
      .then((match) => {
        if (cancelled || !match) return;
        const sides = matchSides(match);
        setHomeLabel(sides.homeName);
        setAwayLabel(sides.awayName);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setActiveId(trimmed);
  };

  return (
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <form
        className="flex flex-col gap-3 rounded-md border border-lborder bg-card p-4 sm:flex-row sm:items-end sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">Match id</span>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={EXAMPLE_MATCH_ID}
            className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 font-mono text-sm text-mtext outline-none focus:border-accent"
          />
        </label>
        <button type="submit" className="btn-brand shrink-0 rounded-md px-5 py-2.5 text-sm font-semibold">
          Load odds
        </button>
      </form>
      <p className="text-xs text-stext">
        Example:{' '}
        <button
          type="button"
          className="font-mono text-accent hover:underline"
          onClick={() => {
            setInput(EXAMPLE_MATCH_ID);
            setActiveId(EXAMPLE_MATCH_ID);
          }}
        >
          {EXAMPLE_MATCH_ID}
        </button>
      </p>
      {activeId ? (
        <MatchOddsView matchId={activeId} homeLabel={homeLabel} awayLabel={awayLabel} pollLive compact />
      ) : null}
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
