'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { fetchLiveMatches, fetchMatches } from '../../services/matches';
import { fetchMatchPredictions } from '../../services/predictions';
import type { Match } from '../../types';
import type { MatchPredictions } from '../../types/predictions';
import type { ToolDef } from '../../lib/toolsCatalog';
import { SelectField, ToolPage, ToolPanel, ResultBox } from './ToolShared';

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
        setMatches(
          rows.filter((item) => {
            const id = matchId(item);
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          })
        );
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
    <ToolPage tool={tool} note="Reads an existing prediction run. This page does not compute a new model score or win chance.">
      <ToolPanel
        aside={
          <ResultBox
            label={scoreMode ? 'Stored score range (low · expected · high)' : 'Stored win split (home / away)'}
            value={loading ? '…' : headline}
          />
        }
      >
        <SelectField label="Stored match" value={picked} onChange={setPicked}>
          <option value="">Select a live or upcoming match</option>
          {matches.map((match) => (
            <option key={matchId(match)} value={matchId(match)}>
              {matchLabel(match)}
            </option>
          ))}
        </SelectField>
        {picked ? (
          <Link
            href="/predictions"
            className="btn-brand inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold"
          >
            Open Predictions
            <ArrowRight size={14} />
          </Link>
        ) : null}
      </ToolPanel>
    </ToolPage>
  );
}
