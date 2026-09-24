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
  ResultBox,
  num,
} from './ToolShared';
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
    <ToolPage tool={tool}>
      <ToolPanel aside={<ResultBox value={result} />}>
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
      </ToolPanel>
    </ToolPage>
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
