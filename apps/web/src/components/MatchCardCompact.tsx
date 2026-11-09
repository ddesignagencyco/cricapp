'use client';

import TeamLogo from './TeamLogo';
import Link from 'next/link';
import { getInitials } from '../utils/helpers';

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
      prefetch={false}
      className="card-interactive group block rounded-md px-3.5 py-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-stext">
          {tournament || 'Match'}
        </p>
        <p className="shrink-0 text-xs">
          {date ? <span className="font-semibold tabular-nums text-accent">{date}</span> : null}
          {time ? <span className="font-semibold tabular-nums text-mtext">{date ? ' · ' : ''}{time}</span> : null}
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
  const badge = <TeamLogo code={abbr} name={name} size="sm" link={false} />;

  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      {badge}
      <p className="min-w-0 truncate text-sm font-semibold text-mtext" title={name}>
        {name}
      </p>
    </div>
  );
}
