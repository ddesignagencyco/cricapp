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
import {
  Field,
  SelectField,
  ToolCheckbox,
  ToolPage,
  ToolPanel,
  ToolError,
  ResultBox,
} from './ToolShared';
import { firstError, readNumber, readOvers } from './toolInputs';
import ToolDls from './ToolDls';
import ToolFantasy from './ToolFantasy';
import ToolBookmakerMargin from './ToolBookmakerMargin';
import ToolOdds from './ToolOdds';
import ToolOddsMatch from './ToolOddsMatch';
import ToolPlayerCompare from './ToolPlayerCompare';
import ToolStoredPrediction from './ToolStoredPrediction';
import ToolWhatIf from './ToolWhatIf';

export default function ToolCalculator({ tool }: { tool: ToolDef }) {
  switch (tool.kind) {
    case 'compare':
    case 'h2h':
      return (
        <ToolPage tool={tool}>
          <CompareBoard />
        </ToolPage>
      );
    case 'player-compare':
      return <ToolPlayerCompare tool={tool} />;
    case 'dls':
      return <ToolDls tool={tool} />;
    case 'odds':
      return <ToolOdds tool={tool} />;
    case 'implied':
      return <ToolBookmakerMargin tool={tool} />;
    case 'odds-match':
      return <ToolOddsMatch tool={tool} />;
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

  const reset = () => {
    setA('');
    setB('');
    setC('');
    setD('');
    setDays(5);
    setAllOutFor(false);
    setAllOutAgainst(false);
    setScheduled('50');
  };

  const { result, error } = useMemo(() => {
    const raw = { a, b, c, d };
    const quota = tool.kind === 'nrr' ? readOvers(scheduled, 'Scheduled overs') : null;
    const quotaMax = quota?.value ? quota.value : undefined;
    const inputs = fieldsFor(tool.kind).map((field) => {
      // Messages name the field without its "(e.g. 12.4)" example.
      const name = field.label.replace(/\s*\(.*\)$/, '');
      const input =
        field.type === 'overs'
          ? readOvers(raw[field.key], name, { max: quotaMax })
          : readNumber(raw[field.key], name, { integer: true });
      return { ...field, input };
    });
    const invalid = firstError(quota, ...inputs.map((field) => field.input));
    if (invalid) return { result: '—', error: invalid };
    // NRR with an all-out side uses the scheduled quota, so that side's overs may stay blank.
    const optional = (key: string) =>
      tool.kind === 'nrr' && ((key === 'b' && allOutFor) || (key === 'd' && allOutAgainst));
    if (inputs.some((field) => field.input.value === null && !optional(field.key))) {
      return { result: '—', error: null };
    }
    const v = (key: 'a' | 'b' | 'c' | 'd') => inputs.find((field) => field.key === key)?.input.value ?? 0;
    switch (tool.kind) {
      case 'nrr':
        return {
          error: null,
          result: formatRate(
            netRunRate(v('a'), v('b'), v('c'), v('d'), {
              allOutFor,
              allOutAgainst,
              scheduledOvers: quota?.value ?? 0,
            })
          ),
        };
      case 'rrr':
        return { error: null, result: formatRate(requiredRunRate(v('a'), v('b'))) };
      case 'crr':
        return { error: null, result: formatRate(currentRunRate(v('a'), v('b'))) };
      case 'sr':
        return { error: null, result: formatRate(battingStrikeRate(v('a'), v('b'))) };
      case 'bat-avg':
        return { error: null, result: formatRate(battingAverage(v('a'), v('b'))) };
      case 'bowl-avg':
        return { error: null, result: formatRate(bowlingAverage(v('a'), v('b'))) };
      case 'econ':
        return { error: null, result: formatRate(bowlingEconomy(v('a'), v('b'))) };
      case 'follow-on': {
        const check = followOnLead(v('a'), v('b'), days);
        return {
          error: null,
          result: `Lead ${check.lead}. Need ${check.needed}. ${check.enforced ? 'Follow-on available.' : 'Not yet.'}`,
        };
      }
      default:
        return { result: '', error: null };
    }
  }, [tool.kind, a, b, c, d, days, allOutFor, allOutAgainst, scheduled]);

  const fields = fieldsFor(tool.kind);

  return (
    <ToolPage tool={tool}>
      <ToolPanel onReset={reset} aside={<ResultBox value={result} />}>
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
          <div className="space-y-3">
            <Field label="Scheduled overs (if all out)" value={scheduled} onChange={setScheduled} />
            <ToolCheckbox label="Batting side all out" checked={allOutFor} onChange={setAllOutFor} />
            <ToolCheckbox label="Bowling side dismissed opponents" checked={allOutAgainst} onChange={setAllOutAgainst} />
          </div>
        )}
        {tool.kind === 'follow-on' && (
          <SelectField label="Match length" value={String(days)} onChange={(v) => setDays(Number(v) as FollowOnDays)}>
            <option value="5">5 days — 200</option>
            <option value="4">4 days — 150</option>
            <option value="3">3 days — 150</option>
            <option value="2">2 days — 100</option>
            <option value="1">1 day — 75</option>
          </SelectField>
        )}
        <ToolError message={error} />
      </ToolPanel>
    </ToolPage>
  );
}

function fieldsFor(kind: ToolDef['kind']): Array<{
  key: 'a' | 'b' | 'c' | 'd';
  label: string;
  /** overs: cricket notation (12.4); count: a non-negative whole number. */
  type: 'overs' | 'count';
}> {
  switch (kind) {
    case 'nrr':
      return [
        { key: 'a', label: 'Runs for', type: 'count' },
        { key: 'b', label: 'Overs faced (e.g. 48.3)', type: 'overs' },
        { key: 'c', label: 'Runs against', type: 'count' },
        { key: 'd', label: 'Overs bowled', type: 'overs' },
      ];
    case 'rrr':
      return [
        { key: 'a', label: 'Runs needed', type: 'count' },
        { key: 'b', label: 'Balls left', type: 'count' },
      ];
    case 'crr':
      return [
        { key: 'a', label: 'Runs scored', type: 'count' },
        { key: 'b', label: 'Overs faced (e.g. 12.4)', type: 'overs' },
      ];
    case 'sr':
      return [
        { key: 'a', label: 'Runs', type: 'count' },
        { key: 'b', label: 'Balls', type: 'count' },
      ];
    case 'bat-avg':
      return [
        { key: 'a', label: 'Runs', type: 'count' },
        { key: 'b', label: 'Dismissals', type: 'count' },
      ];
    case 'bowl-avg':
      return [
        { key: 'a', label: 'Runs conceded', type: 'count' },
        { key: 'b', label: 'Wickets', type: 'count' },
      ];
    case 'econ':
      return [
        { key: 'a', label: 'Runs conceded', type: 'count' },
        { key: 'b', label: 'Overs bowled (e.g. 8.3)', type: 'overs' },
      ];
    case 'follow-on':
      return [
        { key: 'a', label: 'First-innings total', type: 'count' },
        { key: 'b', label: 'Opponent score', type: 'count' },
      ];
    default:
      return [];
  }
}
