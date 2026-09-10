import type { BattingRow, BowlingRow } from '../types/index';

interface MappedBattingRow {
  id?: string;
  name: string;
  out?: boolean;
  runs: number | string;
  balls: number | string;
  fours: number | string;
  sixes: number | string;
  sr: string;
}

interface MappedBowlingRow {
  id?: string;
  name: string;
  oversFull: number | string;
  maidens: number | string;
  runsGiven: number | string;
  wickets: number | string;
  econ: string;
}

interface ScheduledDate {
  date: string;
  time: string;
}

export const APP_TIME_ZONE = 'Asia/Karachi';

export function toKarachiISODate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function formatNumber(n: number | string): string {
  return Number(n || 0).toLocaleString('en-US');
}

export function formatRate(n: number | string | undefined | null): string {
  if (n === undefined || n === null) return '—';
  return Number(n).toFixed(2);
}

export function formatScheduled(iso: string | undefined): ScheduledDate {
  if (!iso) return { date: '', time: '' };
  const d: Date = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: toKarachiISODate(d),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: APP_TIME_ZONE }),
  };
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d: Date = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(t: string | undefined): string {
  if (!t) return '';
  const [h, m]: number[] = t.split(':').map(Number);
  const period: string = h >= 12 ? 'PM' : 'AM';
  const hour: number = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function mapBatting(rows: BattingRow[] | undefined): MappedBattingRow[] {
  return (rows || []).map((r: BattingRow) => ({
    id: r.id,
    name: r.name,
    out: r.out,
    runs: r.runs,
    balls: r.balls,
    fours: r.fours,
    sixes: r.sixes,
    sr: Number(r.sr).toFixed(2),
  }));
}

export function mapBowling(rows: BowlingRow[] | undefined): MappedBowlingRow[] {
  return (rows || []).map((r: BowlingRow) => ({
    id: r.id,
    name: r.name,
    oversFull: r.overs,
    maidens: r.maidens,
    runsGiven: r.runs,
    wickets: r.wickets,
    econ: r.wickets === 0 && Number(r.runs) === 0 ? '—' : Number(r.econ).toFixed(2),
  }));
}

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const stop: Set<string> = new Set(['of', 'and', 'the', '&']);
  const words: string[] = name
    .replace(/['']/g, '')
    .split(' ')
    .filter((w: string) => w && !stop.has(w.toLowerCase()));
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return words[0]?.slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
}

export function cap(s?: string | null): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const pslLogos: Record<string, string> = {
  isl: 'https://psl-t20.com/wp-content/uploads/2016/01/psl-islamabad-united.png',
  hyd: 'https://psl-t20.com/wp-content/uploads/2026/03/Hyderabad-Kingsmen-logo-1.png',
  kki: 'https://psl-t20.com/wp-content/uploads/2017/02/psl-karachi-kings.png',
  lqa: 'https://psl-t20.com/wp-content/uploads/2016/01/psl-lahore-qalandars.png',
  mus: 'https://psl-t20.com/wp-content/uploads/2019/01/psl-multan-sultan.png',
  pza: 'https://psl-t20.com/wp-content/uploads/2016/01/psl-peshawar-zalmi.png',
  qgl: 'https://psl-t20.com/wp-content/uploads/2017/02/psl-quetta-gladiators.png',
  raw: 'https://psl-t20.com/wp-content/uploads/2026/03/Rawalpindiz-Logo.png'
};

export function getPslLogo(codeOrId: string): string | null {
  if (!codeOrId) return null;
  const key = codeOrId.toLowerCase();
  return pslLogos[key] || null;
}
