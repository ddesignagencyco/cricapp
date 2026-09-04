import { teams } from '../data/teams';
import type { Team, BattingRow, BowlingRow } from '../types/index';

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

export function teamColor(teamId: string): string {
  const t: Team | undefined = teams.find((x: Team) => x.id === teamId);
  return t?.colors?.primary || '#00C2FF';
}

export function getTeam(teamId: string): Team | undefined {
  return teams.find((t: Team) => t.id === teamId);
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
  const y: number = d.getFullYear();
  const m: string = String(d.getMonth() + 1).padStart(2, '0');
  const day: string = String(d.getDate()).padStart(2, '0');
  return {
    date: `${y}-${m}-${day}`,
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
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

export function getInitials(name: string): string {
  const stop: Set<string> = new Set(['of', 'and', 'the', '&']);
  const words: string[] = name
    .replace(/['']/g, '')
    .split(' ')
    .filter((w: string) => w && !stop.has(w.toLowerCase()));
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return words[0]?.slice(0, 2).toUpperCase() || 'XX';
}
