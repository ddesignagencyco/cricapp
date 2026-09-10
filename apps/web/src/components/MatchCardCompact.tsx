'use client';

import Link from 'next/link';
import { getInitials, getPslLogo } from '../utils/helpers';

interface MatchCardCompactProps {
  match: any;
}

function pickSide(match: any, index: 0 | 1) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const t = isObj ? (index === 0 ? teams.home : teams.away) : null;
  const rawName = t?.name || match.teamNames?.[index] || '';
  const rawCode = t?.code || t?.abbr || t?.shortName || (Array.isArray(teams) ? teams[index] : '') || '';
  const name = String(rawName || '').replace(/^sr:competitor:/, '') || 'TBD';
  const codeStr = String(rawCode || '').replace(/^sr:competitor:/, '');
  const badCode = !codeStr || /^sr:/.test(codeStr) || codeStr.length > 5;
  const abbr = badCode ? getInitials(name) : codeStr.toUpperCase();
  return { name, abbr };
}

function formatWhen(match: any) {
  const raw = match.scheduled || match.date || '';
  if (!raw) return { date: '', time: '' };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: raw, time: '' };
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Karachi' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Karachi' }),
  };
}

export default function MatchCardCompact({ match }: MatchCardCompactProps) {
  const home = pickSide(match, 0);
  const away = pickSide(match, 1);
  const { date, time } = formatWhen(match);
  const tournament = match.tournamentName || match.tournament || '';

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      className="group block rounded-md border border-lborder bg-card px-3.5 py-3 transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-medium uppercase tracking-wide text-stext">
          {tournament || 'Match'}
        </p>
        <p className="shrink-0 text-xs text-stext">
          {date}{time ? ` · ${time}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <TeamCell name={home.name} abbr={home.abbr} align="left" />
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-stext">vs</span>
        <TeamCell name={away.name} abbr={away.abbr} align="right" />
      </div>
    </Link>
  );
}

function TeamCell({ name, abbr, align }: { name: string; abbr: string; align: 'left' | 'right' }) {
  const pslLogo = getPslLogo(abbr);
  let hash = 0;
  for (let i = 0; i < abbr.length; i++) hash = abbr.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  const badge = pslLogo ? (
    <img
      src={pslLogo}
      alt={name}
      className="h-7 w-7 shrink-0 rounded-full border border-lborder bg-white object-contain p-0.5"
    />
  ) : (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 65%, 48%), hsl(${(hue + 28) % 360}, 75%, 32%))` }}
    >
      {abbr.slice(0, 2)}
    </span>
  );

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      {badge}
      <p className="min-w-0 truncate text-sm font-semibold text-mtext" title={name}>
        {name}
      </p>
    </div>
  );
}
