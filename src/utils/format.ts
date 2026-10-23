import type { InningsScore, Match } from '../data/types';

export const overs = (balls: number) => {
  const o = Math.floor(balls / 6);
  const r = balls % 6;
  return r ? `${o}.${r}` : `${o}`;
};

export const score = (i?: InningsScore) =>
  i ? `${i.runs}${i.wickets === 10 ? '' : `/${i.wickets}`}${i.declared ? 'd' : ''}` : '';

export const pct = (p: number, digits = 0) => `${(p * 100).toFixed(digits)}%`;

export const strikeRate = (runs: number, balls: number) => (balls ? ((runs / balls) * 100).toFixed(1) : '-');

export const economy = (runs: number, balls: number) => (balls ? (runs / (balls / 6)).toFixed(2) : '-');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const time = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(today)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 60_000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : shortDate(iso);
};

export const countdown = (iso: string) => {
  const mins = Math.round((+new Date(iso) - Date.now()) / 60_000);
  if (mins <= 0) return 'Starting soon';
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `in ${h}h ${mins % 60}m`;
  return `in ${Math.round(h / 24)}d`;
};

/** Latest innings for a team (Tests can have two). */
export const inningsFor = (m: Match, teamId: string) => m.innings.filter(i => i.teamId === teamId);

export const signed = (n: number, digits = 1) => `${n > 0 ? '+' : ''}${n.toFixed(digits)}`;
