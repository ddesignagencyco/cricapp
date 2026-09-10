'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { StatusBadge, BlinkingDot } from './Badge';
import { formatScheduled, getInitials, getPslLogo } from '../utils/helpers';

interface MatchCardProps {
  match: any;
  compact?: boolean;
  showVenue?: boolean;
}

function pickSide(match: any, index: 0 | 1) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const side = isObj ? (index === 0 ? teams.home : teams.away) : null;
  const rawCode =
    side?.code ||
    side?.abbr ||
    side?.shortName ||
    (Array.isArray(teams) ? teams[index] : '') ||
    '';
  const rawName =
    side?.name ||
    match.teamNames?.[index] ||
    '';
  const name = String(rawName || '').replace(/^sr:competitor:/, '') || 'TBD';
  const codeStr = String(rawCode || '').replace(/^sr:competitor:/, '');
  const badCode = !codeStr || /^sr:/.test(codeStr) || codeStr.length > 5;
  const code = badCode ? getInitials(name) : codeStr.toUpperCase();
  const score = side?.score || '';
  const overs = side?.overs || '';
  return { name, code, score, overs };
}

function liveScore(match: any, battingCode: string, sideCode: string) {
  const inn = match.currentInnings;
  if (!inn || !battingCode || battingCode !== sideCode) return { score: '', overs: '' };
  const runs = inn.runs ?? 0;
  const wickets = inn.wickets ?? 0;
  return {
    score: `${runs}/${wickets}`,
    overs: inn.overs ? String(inn.overs) : '',
  };
}

export default function MatchCard({ match, compact = false, showVenue = true }: MatchCardProps) {
  const home = pickSide(match, 0);
  const away = pickSide(match, 1);
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const inn = match.currentInnings;
  const battingCode = inn?.battingTeam;
  const { date, time } = formatScheduled(match.scheduled);
  const tournament = match.tournamentName || match.tournament || 'Cricket';
  const venue = match.venue || '';
  const result = match.result || '';

  const homeLive = isLive ? liveScore(match, battingCode, home.code) : null;
  const awayLive = isLive ? liveScore(match, battingCode, away.code) : null;
  const homeScore = home.score || homeLive?.score || '';
  const awayScore = away.score || awayLive?.score || '';
  const homeOvers = home.overs || homeLive?.overs || '';
  const awayOvers = away.overs || awayLive?.overs || '';
  const sharedScore = !homeScore && !awayScore && !isUpcoming ? match.displayScore || '' : '';

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      className="group flex flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium uppercase tracking-wide text-stext">
          {tournament}
        </p>
        <StatusBadge status={match.status} />
      </div>

      <div className="space-y-1.5">
        <TeamRow
          code={home.code}
          name={home.name}
          score={isUpcoming ? null : homeScore}
          overs={homeOvers}
          live={isLive && battingCode === home.code}
        />
        <TeamRow
          code={away.code}
          name={away.name}
          score={isUpcoming ? null : awayScore}
          overs={awayOvers}
          live={isLive && battingCode === away.code}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-lborder pt-2 text-xs text-stext">
        {isLive && inn ? (
          <p className="min-w-0 truncate font-medium text-danger">
            <BlinkingDot className="mr-1.5 align-middle" />
            {inn.overs !== null && inn.overs !== undefined ? `${inn.overs} ov` : 'In play'}
            {inn.runRate !== null && inn.runRate !== undefined ? ` · RR ${inn.runRate}` : ''}
          </p>
        ) : isUpcoming ? (
          <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {date && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} className="text-accent" />
                {date}
              </span>
            )}
            {time && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} className="text-accent" />
                {time}
              </span>
            )}
          </p>
        ) : result ? (
          <p className="min-w-0 truncate font-medium text-mtext">{result}</p>
        ) : sharedScore ? (
          <p className="min-w-0 truncate font-mono font-semibold text-mtext">{sharedScore}</p>
        ) : (
          <p className="min-w-0 truncate">
            {[date, !compact && showVenue && venue ? venue.split(',')[0] : '']
              .filter(Boolean)
              .join(' · ') || 'Result'}
          </p>
        )}
        {showVenue && venue && isUpcoming && (
          <span className="hidden max-w-[40%] truncate sm:inline-flex sm:items-center sm:gap-1">
            <MapPin size={12} />
            {venue.split(',')[0]}
          </span>
        )}
      </div>
    </Link>
  );
}

function TeamRow({
  code,
  name,
  score,
  overs,
  live,
}: {
  code: string;
  name: string;
  score: string | null;
  overs: string;
  live?: boolean;
}) {
  const pslLogo = getPslLogo(code);
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <div className="flex items-center gap-2.5">
      {pslLogo ? (
        <img
          src={pslLogo}
          alt={name}
          className="h-7 w-7 shrink-0 rounded-full border border-lborder bg-white object-contain p-0.5"
        />
      ) : (
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, hsl(${hue}, 65%, 48%), hsl(${(hue + 28) % 360}, 75%, 32%))`,
          }}
          title={name}
        >
          {getInitials(name || code)}
        </span>
      )}
      <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${live ? 'text-accent' : 'text-mtext'}`}>
        {name}
      </p>
      {score !== null && (
        <div className="shrink-0 text-right">
          <p className={`font-mono text-sm font-semibold tabular-nums ${live ? 'text-accent' : 'text-mtext'}`}>
            {score || '—'}
          </p>
          {overs && <p className="font-mono text-[11px] text-stext">{overs} ov</p>}
        </div>
      )}
    </div>
  );
}
