import type { IconName } from '../components/ui/Icon';

/*
 * Cricket calculators, defined as data: inputs plus a pure compute
 * function. The Tool screen renders any of them, so adding a tool is
 * adding an entry here.
 */

export type FieldKind = 'number' | 'overs';

export interface Field {
  key: string;
  label: string;
  kind?: FieldKind;
  placeholder?: string;
  hint?: string;
}

export interface Result {
  label: string;
  value: string;
  primary?: boolean;
  tone?: 'good' | 'bad';
}

export interface Tool {
  id: string;
  title: string;
  short: string;
  icon: IconName;
  group: 'Run rates' | 'Batting & bowling' | 'Match situations' | 'Odds & probability';
  fields: Field[];
  compute: (v: Record<string, number>) => Result[] | null;
  explain: string;
}

/** "19.4" → 19 overs and 4 balls → 19.667 overs. Returns NaN if the ball count is 6+. */
export function parseOvers(text: string): number {
  const [o, b = '0'] = text.trim().split('.');
  const overs = Number(o);
  const balls = Number(b.slice(0, 1));
  if (!Number.isFinite(overs) || !Number.isFinite(balls) || balls > 5) return NaN;
  return overs + balls / 6;
}

const f2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '–');
const ok = (...ns: number[]) => ns.every(n => Number.isFinite(n));

export const TOOLS: Tool[] = [
  {
    id: 'crr',
    title: 'Current run rate',
    short: 'CRR',
    icon: 'gauge',
    group: 'Run rates',
    fields: [
      { key: 'runs', label: 'Runs scored', placeholder: '145' },
      { key: 'overs', label: 'Overs bowled', kind: 'overs', placeholder: '16.3' },
    ],
    compute: ({ runs, overs }) => (ok(runs, overs) && overs > 0 ? [{ label: 'Current run rate', value: f2(runs / overs), primary: true }] : null),
    explain: 'Runs divided by overs, where 16.3 means 16 overs and 3 balls (16.5 overs).',
  },
  {
    id: 'rrr',
    title: 'Required run rate',
    short: 'RRR',
    icon: 'target',
    group: 'Run rates',
    fields: [
      { key: 'target', label: 'Target', placeholder: '187' },
      { key: 'runs', label: 'Current score', placeholder: '145' },
      { key: 'overs', label: 'Overs bowled', kind: 'overs', placeholder: '16.3' },
      { key: 'total', label: 'Total overs', placeholder: '20' },
    ],
    compute: ({ target, runs, overs, total }) => {
      if (!ok(target, runs, overs, total) || total <= overs) return null;
      const need = target - runs;
      const balls = Math.round((total - overs) * 6);
      return [
        { label: 'Required run rate', value: need <= 0 ? 'Won' : f2(need / ((total - overs) || 1)), primary: true },
        { label: 'Runs needed', value: String(Math.max(0, need)) },
        { label: 'Balls left', value: String(balls) },
      ];
    },
    explain: 'Runs still needed divided by overs remaining.',
  },
  {
    id: 'nrr',
    title: 'Net run rate',
    short: 'NRR',
    icon: 'sigma',
    group: 'Run rates',
    fields: [
      { key: 'scored', label: 'Runs scored', placeholder: '1240' },
      { key: 'faced', label: 'Overs faced', kind: 'overs', placeholder: '148.2' },
      { key: 'conceded', label: 'Runs conceded', placeholder: '1198' },
      { key: 'bowled', label: 'Overs bowled', kind: 'overs', placeholder: '150', hint: 'If a side is bowled out, count its full quota of overs.' },
    ],
    compute: ({ scored, faced, conceded, bowled }) => {
      if (!ok(scored, faced, conceded, bowled) || faced <= 0 || bowled <= 0) return null;
      const nrr = scored / faced - conceded / bowled;
      return [
        { label: 'Net run rate', value: `${nrr > 0 ? '+' : ''}${nrr.toFixed(3)}`, primary: true, tone: nrr >= 0 ? 'good' : 'bad' },
        { label: 'Runs per over for', value: f2(scored / faced) },
        { label: 'Runs per over against', value: f2(conceded / bowled) },
      ];
    },
    explain: 'Your run rate across the tournament minus the run rate scored against you.',
  },
  {
    id: 'sr',
    title: 'Batting strike rate',
    short: 'SR',
    icon: 'zap',
    group: 'Batting & bowling',
    fields: [
      { key: 'runs', label: 'Runs', placeholder: '47' },
      { key: 'balls', label: 'Balls faced', placeholder: '22' },
    ],
    compute: ({ runs, balls }) => (ok(runs, balls) && balls > 0 ? [{ label: 'Strike rate', value: ((runs / balls) * 100).toFixed(1), primary: true }] : null),
    explain: 'Runs scored per 100 balls faced.',
  },
  {
    id: 'batavg',
    title: 'Batting average',
    short: 'AVG',
    icon: 'chartColumn',
    group: 'Batting & bowling',
    fields: [
      { key: 'runs', label: 'Career runs', placeholder: '4302' },
      { key: 'outs', label: 'Times dismissed', placeholder: '108' },
    ],
    compute: ({ runs, outs }) => (ok(runs, outs) && outs > 0 ? [{ label: 'Batting average', value: f2(runs / outs), primary: true }] : null),
    explain: 'Runs divided by dismissals. Not-out innings add runs but not a dismissal.',
  },
  {
    id: 'bowlavg',
    title: 'Bowling average',
    short: 'BAVG',
    icon: 'circleDot',
    group: 'Batting & bowling',
    fields: [
      { key: 'runs', label: 'Runs conceded', placeholder: '2475' },
      { key: 'wkts', label: 'Wickets', placeholder: '112' },
    ],
    compute: ({ runs, wkts }) => (ok(runs, wkts) && wkts > 0 ? [{ label: 'Bowling average', value: f2(runs / wkts), primary: true }] : null),
    explain: 'Runs conceded per wicket taken. Lower is better.',
  },
  {
    id: 'econ',
    title: 'Bowling economy',
    short: 'ECON',
    icon: 'timer',
    group: 'Batting & bowling',
    fields: [
      { key: 'runs', label: 'Runs conceded', placeholder: '34' },
      { key: 'overs', label: 'Overs bowled', kind: 'overs', placeholder: '4' },
    ],
    compute: ({ runs, overs }) => (ok(runs, overs) && overs > 0 ? [{ label: 'Economy rate', value: f2(runs / overs), primary: true }] : null),
    explain: 'Runs conceded per over bowled.',
  },
  {
    id: 'followon',
    title: 'Follow-on',
    short: 'F/O',
    icon: 'arrowDownUp',
    group: 'Match situations',
    fields: [
      { key: 'first', label: 'First-innings score (batting first)', placeholder: '412' },
      { key: 'second', label: 'Opponent first-innings score', placeholder: '210' },
      { key: 'days', label: 'Scheduled days', placeholder: '5', hint: 'Threshold: 200 (5+ days), 150 (3–4), 100 (2), 75 (1).' },
    ],
    compute: ({ first, second, days }) => {
      if (!ok(first, second, days)) return null;
      const need = days >= 5 ? 200 : days >= 3 ? 150 : days >= 2 ? 100 : 75;
      const lead = first - second;
      const can = lead >= need;
      return [
        { label: can ? 'Follow-on can be enforced' : 'Follow-on avoided', value: can ? 'Yes' : 'No', primary: true, tone: can ? 'bad' : 'good' },
        { label: 'First-innings lead', value: String(lead) },
        { label: 'To avoid, reach', value: String(first - need + 1) },
      ];
    },
    explain: 'The side batting first may ask the other to bat again if it leads by the threshold or more (Law 14).',
  },
  {
    id: 'odds',
    title: 'Odds converter',
    short: 'ODDS',
    icon: 'arrowDownUp',
    group: 'Odds & probability',
    fields: [{ key: 'dec', label: 'Decimal odds', placeholder: '2.50' }],
    compute: ({ dec }) => {
      if (!ok(dec) || dec <= 1) return null;
      const frac = dec - 1;
      const american = dec >= 2 ? `+${Math.round(frac * 100)}` : `${Math.round(-100 / frac)}`;
      const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
      const n = Math.round(frac * 100);
      const g = gcd(n, 100);
      return [
        { label: 'Implied probability', value: `${(100 / dec).toFixed(1)}%`, primary: true },
        { label: 'Fractional', value: `${n / g}/${100 / g}` },
        { label: 'American', value: american },
      ];
    },
    explain: 'Converts a decimal price into fractional, American and its implied probability (1 ÷ odds).',
  },
  {
    id: 'implied',
    title: 'Implied probability & margin',
    short: 'P%',
    icon: 'percent',
    group: 'Odds & probability',
    fields: [
      { key: 'a', label: 'Team A decimal odds', placeholder: '1.80' },
      { key: 'b', label: 'Team B decimal odds', placeholder: '2.05' },
    ],
    compute: ({ a, b }) => {
      if (!ok(a, b) || a <= 1 || b <= 1) return null;
      const pa = 1 / a;
      const pb = 1 / b;
      const book = pa + pb;
      return [
        { label: 'Bookmaker margin', value: `${((book - 1) * 100).toFixed(1)}%`, primary: true },
        { label: 'Team A (no margin)', value: `${((pa / book) * 100).toFixed(1)}%` },
        { label: 'Team B (no margin)', value: `${((pb / book) * 100).toFixed(1)}%` },
      ];
    },
    explain: 'Implied probabilities add up to more than 100%; the excess is the margin. Removing it gives a fair estimate.',
  },
];

/** Shown in the hub as "coming soon". */
export const UPCOMING_TOOLS: { title: string; icon: IconName }[] = [
  { title: 'DLS calculator', icon: 'cloudRain' },
  { title: 'Match simulator', icon: 'play' },
  { title: 'What-if simulator', icon: 'layers' },
  { title: 'Fantasy points', icon: 'wandSparkles' },
];
