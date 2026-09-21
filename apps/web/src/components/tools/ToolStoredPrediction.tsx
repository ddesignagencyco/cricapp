'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { fetchLiveMatches, fetchMatches } from '../../services/matches';
import { fetchMatchPredictions } from '../../services/predictions';
import type { Match } from '../../types';
import type { MatchPredictions } from '../../types/predictions';
import type { ToolDef } from '../../lib/toolsCatalog';
import { MoreTools, ResultBox, ToolIntro } from './ToolShared';

function matchId(match: Match): string {
  return String(match.matchId || match.id || '');
}

function matchLabel(match: Match): string {
  const names = match.teamNames?.filter(Boolean).join(' vs ');
  if (names) return names;
  const home = match.home?.name || match.teams?.home?.name;
  const away = match.away?.name || match.teams?.away?.name;
  if (home && away) return `${home} vs ${away}`;
  return matchId(match) || 'Match';
}

export default function ToolStoredPrediction({ tool }: { tool: ToolDef }) {
  const scoreMode = tool.kind === 'score-predictor';
  const [matches, setMatches] = useState<Match[]>([]);
  const [picked, setPicked] = useState('');
  const [pred, setPred] = useState<MatchPredictions | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLiveMatches(), fetchMatches({ status: 'upcoming', limit: 20 })])
      .then(([live, upcoming]) => {
        if (cancelled) return;
        const rows = [...live, ...upcoming].filter((item) => matchId(item));
        const seen = new Set<string>();
        setMatches(rows.filter((item) => {
          const id = matchId(item);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        }));
      })
      .catch(() => {
        if (!cancelled) setMatches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!picked) {
      setPred(null);
      return;
    }
    setLoading(true);
    fetchMatchPredictions(picked)
      .then(setPred)
      .catch(() => setPred(null))
      .finally(() => setLoading(false));
  }, [picked]);

  const run = pred?.live || pred?.preMatch || null;
  const headline = useMemo(() => {
    if (!run) return '—';
    if (scoreMode) {
      const range = run.scoreRange;
      if (!range || range.expected === null || range.expected === undefined) return 'No stored score range';
      const bits = [range.low, range.expected, range.high].filter((n) => n !== null && n !== undefined);
      return bits.join(' · ');
    }
    return `${Math.round(run.homeWinProb * 100)}% / ${Math.round(run.awayWinProb * 100)}%`;
  }, [run, scoreMode]);

  return (
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <p className="text-xs text-stext">
        Reads an existing prediction run. This page does not compute a new model score or win chance.
      </p>
      <div className="overflow-hidden rounded-md border border-lborder bg-card p-4 sm:p-5">
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">Stored match</span>
          <select
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
            className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
          >
            <option value="">Select a live or upcoming match</option>
            {matches.map((match) => (
              <option key={matchId(match)} value={matchId(match)}>
                {matchLabel(match)}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4">
          <ResultBox
            label={scoreMode ? 'Stored score range (low · expected · high)' : 'Stored win split (home / away)'}
            value={loading ? '…' : headline}
          />
        </div>
        {picked && (
          <Link
            href={`/predictions`}
            className="btn-brand mt-4 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold"
          >
            Open Predictions
            <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
