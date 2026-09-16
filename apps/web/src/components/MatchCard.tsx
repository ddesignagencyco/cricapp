'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { StatusBadge, BlinkingDot } from './Badge';
import RemoteImage from './RemoteImage';
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

function normTeamToken(value: string): string {
  return String(value || '')
    .replace(/^sr:competitor:/, '')
    .trim()
    .toLowerCase();
}

function isBattingSide(battingTeam: string | undefined, side: { code: string; name: string }): boolean {
  const needle = normTeamToken(battingTeam || '');
  if (!needle) return false;
  const code = normTeamToken(side.code);
  const name = normTeamToken(side.name);
  if (needle === code || needle === name) return true;
  if (code && (needle.startsWith(code) || code.startsWith(needle))) return true;
  if (name && (name.includes(needle) || needle.includes(name))) return true;
  return false;
}

function liveSideScore(match: any, side: { code: string; name: string }) {
  const inn = match.currentInnings;
  if (!inn || !isBattingSide(inn.battingTeam, side)) return { score: '', overs: '' };

  const display = String(match.displayScore || '').trim();
  const runs = Number(inn.runs);
  const wickets = Number(inn.wickets);
  const overs = inn.overs !== null && inn.overs !== undefined ? String(inn.overs) : '';
  const missingBattingStats =
    (!Number.isFinite(runs) || runs === 0) &&
    (!Number.isFinite(wickets) || wickets === 0) &&
    Number(inn.overs) >= 1;

  if (display && display !== '0/0' && display !== '0-0') {
    return { score: display, overs };
  }
  if (!missingBattingStats && Number.isFinite(runs) && Number.isFinite(wickets)) {
    return { score: `${runs}/${wickets}`, overs };
  }
  if (display) return { score: display, overs };
  return { score: '', overs };
}

export default function MatchCard({ match, compact: _compact = false, showVenue = true }: MatchCardProps) {
  const home = pickSide(match, 0);
  const away = pickSide(match, 1);
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const inn = match.currentInnings;
  const { date, time } = formatScheduled(match.scheduled);
  const tournament = match.tournamentName || match.tournament || 'Cricket';
  const venue = match.venue || '';
  const result = match.result || '';

  const homeLive = isLive ? liveSideScore(match, home) : null;
  const awayLive = isLive ? liveSideScore(match, away) : null;
  let homeScore = home.score || homeLive?.score || '';
  let awayScore = away.score || awayLive?.score || '';
  const homeOvers = home.overs || homeLive?.overs || '';
  const awayOvers = away.overs || awayLive?.overs || '';
  const homeBatting = isLive && isBattingSide(inn?.battingTeam, home);
  const awayBatting = isLive && isBattingSide(inn?.battingTeam, away);
  const display = String(match.displayScore || '').trim();
  if (isLive && !homeScore && !awayScore && display && display !== '0/0' && display !== '0-0') {
    if (awayBatting) awayScore = display;
    else homeScore = display;
  }
  const sharedScore = !homeScore && !awayScore && !isUpcoming ? match.displayScore || '' : '';
  const footerRight = isUpcoming && showVenue && venue
    ? venue.split(',')[0]
    : !isUpcoming && !isLive
      ? result || sharedScore
      : '';
  const footerRightIsVenue = isUpcoming && !!footerRight;

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      prefetch={false}
      className="elev-card group flex h-full flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-stext">
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
          live={homeBatting}
        />
        <TeamRow
          code={away.code}
          name={away.name}
          score={isUpcoming ? null : awayScore}
          overs={awayOvers}
          live={awayBatting}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-lborder pt-2 text-xs">
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {isLive && inn ? (
            <span className="truncate font-semibold tabular-nums text-danger">
              <BlinkingDot className="mr-1.5 align-middle" />
              {inn.overs !== null && inn.overs !== undefined ? `${inn.overs} ov` : 'In play'}
              {Number(inn.runRate) > 0 ? ` · RR ${inn.runRate}` : ''}
            </span>
          ) : (
            <>
              {date && (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-accent">
                  <Calendar size={12} />
                  {date}
                </span>
              )}
              {isUpcoming && time && (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-mtext">
                  <Clock size={12} />
                  {time}
                </span>
              )}
            </>
          )}
        </p>
        {footerRight ? (
          <span
            className={`max-w-[48%] shrink-0 truncate text-right ${
              footerRightIsVenue
                ? 'inline-flex items-center justify-end gap-1 font-medium text-stext'
                : 'font-mono text-sm font-bold tabular-nums text-mtext'
            }`}
          >
            {footerRightIsVenue && <MapPin size={12} />}
            {footerRight}
          </span>
        ) : null}
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
        <RemoteImage
          src={pslLogo}
          alt={name}
          width={28}
          height={28}
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
        <div className="min-w-14 shrink-0 text-right">
          <p className={`font-mono text-sm font-bold tabular-nums ${live ? 'text-accent' : 'text-mtext'}`}>
            {score || '—'}
          </p>
          {overs && <p className="font-mono text-xs font-medium tabular-nums text-muted-foreground">{overs} ov</p>}
        </div>
      )}
    </div>
  );
}
