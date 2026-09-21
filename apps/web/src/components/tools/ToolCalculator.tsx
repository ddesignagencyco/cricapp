'use client';

import { useMemo, useState } from 'react';
import CompareBoard from '../boards/CompareBoard';
import {
  battingAverage,
  battingStrikeRate,
  bowlingAverage,
  bowlingEconomy,
  currentRunRate,
  followOnLead,
  formatRate,
  netRunRate,
  requiredRunRate,
  type FollowOnDays,
} from '../../lib/cricketMath';
import { type ToolDef } from '../../lib/toolsCatalog';
import { ToolGlyph } from './toolIcons';
import { Field, MoreTools, ResultBox, ToolIntro, num } from './ToolShared';
import ToolDls from './ToolDls';
import ToolFantasy from './ToolFantasy';
import ToolOdds from './ToolOdds';
import ToolPlayerCompare from './ToolPlayerCompare';
import ToolStoredPrediction from './ToolStoredPrediction';
import ToolWhatIf from './ToolWhatIf';

export default function ToolCalculator({ tool }: { tool: ToolDef }) {
  switch (tool.kind) {
    case 'compare':
    case 'h2h':
      return (
        <div className="space-y-6">
          <ToolIntro tool={tool} />
          <CompareBoard />
          <MoreTools currentSlug={tool.slug} />
        </div>
      );
    case 'player-compare':
      return <ToolPlayerCompare tool={tool} />;
    case 'dls':
      return <ToolDls tool={tool} />;
    case 'odds':
    case 'implied':
      return <ToolOdds tool={tool} />;
    case 'fantasy':
      return <ToolFantasy tool={tool} />;
    case 'what-if':
    case 'match-sim':
      return <ToolWhatIf tool={tool} />;
    case 'predictions':
    case 'score-predictor':
      return <ToolStoredPrediction tool={tool} />;
    case 'nrr':
    case 'rrr':
    case 'crr':
    case 'sr':
    case 'bat-avg':
    case 'bowl-avg':
    case 'econ':
    case 'follow-on':
      return <SimpleCalculator tool={tool} />;
    default: {
      const _unused: never = tool.kind;
      return _unused;
    }
  }
}

function SimpleCalculator({ tool }: { tool: ToolDef }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [d, setD] = useState('');
  const [days, setDays] = useState<FollowOnDays>(5);
  const [allOutFor, setAllOutFor] = useState(false);
  const [allOutAgainst, setAllOutAgainst] = useState(false);
  const [scheduled, setScheduled] = useState('50');

  const result = useMemo(() => {
    switch (tool.kind) {
      case 'nrr':
        return formatRate(
          netRunRate(num(a), num(b), num(c), num(d), {
            allOutFor,
            allOutAgainst,
            scheduledOvers: num(scheduled),
          })
        );
      case 'rrr':
        return formatRate(requiredRunRate(num(a), num(b)));
      case 'crr':
        return formatRate(currentRunRate(num(a), num(b)));
      case 'sr':
        return formatRate(battingStrikeRate(num(a), num(b)));
      case 'bat-avg':
        return formatRate(battingAverage(num(a), num(b)));
      case 'bowl-avg':
        return formatRate(bowlingAverage(num(a), num(b)));
      case 'econ':
        return formatRate(bowlingEconomy(num(a), num(b)));
      case 'follow-on': {
        const check = followOnLead(num(a), num(b), days);
        return `Lead ${check.lead}. Need ${check.needed}. ${check.enforced ? 'Follow-on available.' : 'Not yet.'}`;
      }
      default:
        return '';
    }
  }, [tool.kind, a, b, c, d, days, allOutFor, allOutAgainst, scheduled]);

  const fields = fieldsFor(tool.kind);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-md border border-lborder bg-card">
        <div className="flex items-start gap-3 border-b border-lborder bg-secondary px-4 py-3 sm:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-lborder bg-card text-accent">
            <ToolGlyph kind={tool.kind} size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tight text-mtext">{tool.title}</h1>
            <p className="mt-0.5 text-xs text-stext">{tool.blurb}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  value={field.key === 'a' ? a : field.key === 'b' ? b : field.key === 'c' ? c : d}
                  onChange={field.key === 'a' ? setA : field.key === 'b' ? setB : field.key === 'c' ? setC : setD}
                />
              ))}
            </div>
            {tool.kind === 'nrr' && (
              <div className="space-y-2">
                <Field label="Scheduled overs (if all out)" value={scheduled} onChange={setScheduled} />
                <label className="flex items-center gap-2 text-sm text-mtext">
                  <input type="checkbox" checked={allOutFor} onChange={(event) => setAllOutFor(event.target.checked)} />
                  Batting side all out
                </label>
                <label className="flex items-center gap-2 text-sm text-mtext">
                  <input type="checkbox" checked={allOutAgainst} onChange={(event) => setAllOutAgainst(event.target.checked)} />
                  Bowling side dismissed opponents
                </label>
              </div>
            )}
            {tool.kind === 'follow-on' && (
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">
                  Match length
                </span>
                <select
                  value={String(days)}
                  onChange={(event) => setDays(Number(event.target.value) as FollowOnDays)}
                  className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
                >
                  <option value="5">5 days — 200</option>
                  <option value="4">4 days — 150</option>
                  <option value="3">3 days — 150</option>
                  <option value="2">2 days — 100</option>
                  <option value="1">1 day — 75</option>
                </select>
              </label>
            )}
          </div>
          <ResultBox value={result} />
        </div>
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}

function fieldsFor(kind: ToolDef['kind']): Array<{ key: 'a' | 'b' | 'c' | 'd'; label: string }> {
  switch (kind) {
    case 'nrr':
      return [
        { key: 'a', label: 'Runs for' },
        { key: 'b', label: 'Overs faced (e.g. 48.3)' },
        { key: 'c', label: 'Runs against' },
        { key: 'd', label: 'Overs bowled' },
      ];
    case 'rrr':
      return [
        { key: 'a', label: 'Runs needed' },
        { key: 'b', label: 'Balls left' },
      ];
    case 'crr':
      return [
        { key: 'a', label: 'Runs scored' },
        { key: 'b', label: 'Overs faced (e.g. 12.4)' },
      ];
    case 'sr':
      return [
        { key: 'a', label: 'Runs' },
        { key: 'b', label: 'Balls' },
      ];
    case 'bat-avg':
      return [
        { key: 'a', label: 'Runs' },
        { key: 'b', label: 'Dismissals' },
      ];
    case 'bowl-avg':
      return [
        { key: 'a', label: 'Runs conceded' },
        { key: 'b', label: 'Wickets' },
      ];
    case 'econ':
      return [
        { key: 'a', label: 'Runs conceded' },
        { key: 'b', label: 'Overs bowled (e.g. 8.3)' },
      ];
    case 'follow-on':
      return [
        { key: 'a', label: 'First-innings total' },
        { key: 'b', label: 'Opponent score' },
      ];
    default:
      return [];
  }
}
