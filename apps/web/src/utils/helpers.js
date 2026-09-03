import { teams } from '../data/teams';

/** Resolve a team's accent color by id, with a safe fallback. */
export function teamColor(teamId) {
  const t = teams.find((x) => x.id === teamId);
  return t?.colors?.primary || '#00C2FF';
}

/** Resolve a team object by id. */
export function getTeam(teamId) {
  return teams.find((t) => t.id === teamId);
}

/** Format a number with commas. */
export function formatNumber(n) {
  return Number(n || 0).toLocaleString('en-US');
}

/** Format strike rate / economy to two decimals. */
export function formatRate(n) {
  if (n === undefined || n === null) return '—';
  return Number(n).toFixed(2);
}

/** Format a date like "Aug 29, 2026". */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Short human time like "7:00 PM". */
export function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/** Map internal batting scorecard rows to the table's display shape. */
export function mapBatting(rows) {
  return (rows || []).map((r) => ({
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

/** Map internal bowling scorecard rows to the table's display shape. */
export function mapBowling(rows) {
  return (rows || []).map((r) => ({
    id: r.id,
    name: r.name,
    oversFull: r.overs,
    maidens: r.maidens,
    runsGiven: r.runs,
    wickets: r.wickets,
    econ: r.wickets === 0 && Number(r.runs) === 0 ? '—' : Number(r.econ).toFixed(2),
  }));
}

/** Compute initials from a team name, skipping common stop words. */
export function getInitials(name) {
  const stop = new Set(['of', 'and', 'the', '&']);
  const words = name
    .replace(/['']/g, '')
    .split(' ')
    .filter((w) => w && !stop.has(w.toLowerCase()));
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return words[0]?.slice(0, 2).toUpperCase() || 'XX';
}
