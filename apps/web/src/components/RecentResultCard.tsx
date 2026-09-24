'use client';

import Link from 'next/link';
import { StatusBadge } from './Badge';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
import { getInitials, getPslLogo } from '../utils/helpers';
import { describeMatchResult, scoreboardFromMatch } from '../lib/matchScoreboard';

interface RecentResultCardProps {
  match: any;
}

export default function RecentResultCard({ match }: RecentResultCardProps) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? teams.home : null;
  const away = isObj ? teams.away : null;

  const board = scoreboardFromMatch(match);
  const homeCode = board.home.code;
  const awayCode = board.away.code;
  const homeName = board.home.name;
  const awayName = board.away.name;
  const homeScore = board.homeScore || home?.score || '';
  const awayScore = board.awayScore || away?.score || '';
  const homeOvers = board.homeOvers || home?.overs || '';
  const awayOvers = board.awayOvers || away?.overs || '';
  const result = describeMatchResult(match);
  const resultLine = result;
  const tournament = match.tournamentName || match.tournament || '';
  const venue = match.venue || '';

  const rawDate = match.date || match.scheduled || '';
  let dateLabel = '';
  if (rawDate) {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Karachi',
      });
    }
  }

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      prefetch={false}
      className="elev-card group flex h-full flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-stext">
          {tournament || 'Match'}
        </p>
        <StatusBadge status="completed" />
      </div>

      <div className="space-y-2">
        <ScoreRow code={homeCode} name={homeName} score={homeScore} overs={homeOvers} />
        <ScoreRow code={awayCode} name={awayName} score={awayScore} overs={awayOvers} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-lborder pt-2.5 text-xs">
        <p className="min-w-0 truncate">
          {dateLabel ? <span className="font-semibold tabular-nums text-accent">{dateLabel}</span> : null}
          {venue ? <span className="font-medium text-stext">{dateLabel ? ' · ' : ''}{venue.split(',')[0]}</span> : null}
        </p>
        {resultLine ? (
          <p className="max-w-[48%] shrink-0 truncate text-right text-xs font-semibold text-gold" title={resultLine}>
            {resultLine}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function ScoreRow({ code, name, score, overs }: { code: string; name: string; score: string; overs: string }) {
  const pslLogo = getPslLogo(code);

  return (
    <div className="flex items-center gap-2.5">
      {pslLogo ? (
        <RemoteImage
          src={pslLogo}
          alt={name}
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-full border border-lborder bg-white object-contain p-0.5"
        />
      ) : (
        <EntityAvatar className="h-7 w-7 text-[10px]" title={name}>
          {getInitials(name || code)}
        </EntityAvatar>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-mtext">{name}</p>
      <div className="min-w-14 shrink-0 text-right">
        <p className="font-mono text-sm font-bold tabular-nums text-mtext">{score || '—'}</p>
        {overs && <p className="font-mono text-xs font-medium tabular-nums text-muted-foreground">{overs} ov</p>}
      </div>
    </div>
  );
}
