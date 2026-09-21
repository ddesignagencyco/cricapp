'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
} from '../../lib/cricketMath';
import { TOOLS, type ToolDef } from '../../lib/toolsCatalog';
import { ToolGlyph } from './toolIcons';

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (_next: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 font-mono text-sm font-semibold tabular-nums text-mtext outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

function num(value: string): number {
  return Number(value) || 0;
}

export default function ToolCalculator({ tool }: { tool: ToolDef }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [d, setD] = useState('');
  const [days, setDays] = useState<'4' | '5'>('5');

  const result = useMemo(() => {
    switch (tool.kind) {
      case 'nrr':
        return formatRate(netRunRate(num(a), num(b), num(c), num(d)));
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
        const check = followOnLead(num(a), num(b), days === '4' ? 4 : 5);
        return `Lead ${check.lead}. Need ${check.needed}. ${check.enforced ? 'Follow-on available.' : 'Not yet.'}`;
      }
      case 'compare':
      case 'predictions':
        return '';
      default: {
        const _unused: never = tool.kind;
        void _unused;
        return '';
      }
    }
  }, [tool.kind, a, b, c, d, days]);

  const others = TOOLS.filter((item) => item.slug !== tool.slug).slice(0, 6);

  if (tool.kind === 'compare') {
    return (
      <div className="space-y-6">
        <ToolIntro tool={tool} />
        <CompareBoard />
        <MoreTools tools={others} />
      </div>
    );
  }

  if (tool.kind === 'predictions') {
    return (
      <div className="space-y-6">
        <ToolIntro tool={tool} />
        <div className="rounded-md border border-accent bg-card p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-mtext">
            Win chances come from stored statistical runs. This tool does not invent a new probability.
          </p>
          <Link
            href="/predictions"
            className="btn-brand mt-5 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold"
          >
            Open Predictions
            <ArrowRight size={14} />
          </Link>
        </div>
        <MoreTools tools={others} />
      </div>
    );
  }

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
            {tool.kind === 'follow-on' && (
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">
                  Match length
                </span>
                <select
                  value={days}
                  onChange={(event) => setDays(event.target.value === '4' ? '4' : '5')}
                  className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
                >
                  <option value="5">5 days — need 200</option>
                  <option value="4">4 days — need 150</option>
                </select>
              </label>
            )}
          </div>

          <div className="rounded-md border border-lborder bg-secondary px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stext">Result</p>
            <p className="mt-3 break-words font-mono text-3xl font-black leading-tight tabular-nums text-accent">
              {result || '—'}
            </p>
          </div>
        </div>
      </div>
      <MoreTools tools={others} />
    </div>
  );
}

function ToolIntro({ tool }: { tool: ToolDef }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-lborder bg-card text-accent">
        <ToolGlyph kind={tool.kind} size={20} />
      </span>
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-mtext sm:text-3xl">{tool.title}</h1>
        <p className="mt-1 text-sm text-stext">{tool.blurb}</p>
      </div>
    </div>
  );
}

function MoreTools({ tools }: { tools: ToolDef[] }) {
  if (tools.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-mtext">More tools</h2>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/tools/${item.slug}`}
                className="flex items-center gap-3 rounded-md border border-lborder bg-card px-3 py-2.5 transition-colors hover:border-accent"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-lborder bg-secondary text-accent">
                  <ToolGlyph kind={item.kind} size={14} />
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-mtext">{item.title}</span>
              </Link>
            </li>
        ))}
      </ul>
    </section>
  );
}

function fieldsFor(kind: ToolDef['kind']): Array<{ key: 'a' | 'b' | 'c' | 'd'; label: string }> {
  switch (kind) {
    case 'nrr':
      return [
        { key: 'a', label: 'Runs for' },
        { key: 'b', label: 'Overs faced' },
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
        { key: 'b', label: 'Overs faced' },
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
        { key: 'b', label: 'Overs bowled' },
      ];
    case 'follow-on':
      return [
        { key: 'a', label: 'First-innings total' },
        { key: 'b', label: 'Opponent score' },
      ];
    case 'compare':
    case 'predictions':
      return [];
    default: {
      const _unused: never = kind;
      void _unused;
      return [];
    }
  }
}
