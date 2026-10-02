'use client';

import Link from 'next/link';
import { ChevronRight, Swords } from 'lucide-react';
import { StatusBadge } from '../../Badge';
import LiveIndicator from '../../LiveIndicator';
import TeamLogo from '../../TeamLogo';
import { scoreboardFromMatch, describeMatchResult } from '../../../lib/matchScoreboard';
import { formatShortDate } from './matchFormat';
import type { Match } from '../../../types';

const STATUS_ORDER: Record<string, number> = { live: 0, upcoming: 1, completed: 2, cancelled: 3 };

/**
 * A handful of other matches for the rail.
 *
 * ## One request, not one per card
 *
 * Every row is built from the **cached list** payload the sidebar already fetched for
 * the series — `scoreboardFromMatch` reads the list row it is given and never issues
 * a detail request. That is the difference between a rail costing one call and a rail
 * costing six.
 *
 * ## Ordering
 *
 * Live first, then upcoming, then results. A reader on a match page is looking for
 * what is happening now; finished matches are context, not news.
 */
export default function OtherMatches({
  matches,
  currentMatchId,
  currentTournament,
  currentTournamentId,
  loading,
  viewAllHref,
}: {
  matches: Match[];
  currentMatchId: string;
  /** Only fixtures from this competition belong in the rail. */
  currentTournament?: string | null;
  /**
   * Set when the rail was fetched by competition id. The name guard is then redundant:
   * the API already returned exactly one competition.
   */
  currentTournamentId?: string | null;
  loading?: boolean;
  viewAllHref: string;
}) {
  const rows = dedupe(matches)
    .filter((match) => String(match.matchId ?? match.id ?? '') !== currentMatchId)
    /*
     * The competition guard.
     *
     * When the list is fetched by id the API has already matched exactly one competition
     * and there is nothing left to check here — so this only applies to the name-based
     * fetch, kept for a match whose `tournament_id` was never written. The rail shares its
     * cache key with any other list request for the same shape, and the name filter is a
     * substring match, so without a guard a row from a different competition could be
     * rendered under a heading that says this one — which is worse than showing nothing,
     * because the heading is the reader's only clue.
     */
    .filter((match) => {
      if (currentTournamentId) return true;
      const wanted = String(currentTournament ?? '').trim().toLowerCase();
      if (!wanted) return true;
      const got = String(match.tournament ?? '').trim().toLowerCase();
      return got === wanted || got.includes(wanted) || wanted.includes(got);
    })
    .sort((a, b) => {
      const byStatus = (STATUS_ORDER[String(a.status)] ?? 9) - (STATUS_ORDER[String(b.status)] ?? 9);
      if (byStatus !== 0) return byStatus;
      return String(a.scheduled ?? '').localeCompare(String(b.scheduled ?? ''));
    })
    .slice(0, 6);

  return (
    <section className="mc-rail">
      <header className="mc-rail__head">
        <h2 className="mc-rail__title">
          <Swords size={14} strokeWidth={2.4} aria-hidden="true" className="text-accent" />
          Other Matches
        </h2>
        <Link href={viewAllHref} prefetch={false} className="mc-rail__action">
          View all
        </Link>
      </header>

      {loading ? (
        <ul className="mc-rail__body space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="mc-other-match">
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-1/3 rounded bg-[var(--color-skeleton)]" />
                <div className="h-2.5 w-2/3 rounded bg-[var(--color-skeleton)]" />
              </div>
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <p className="mc-rail__body py-4 text-xs text-stext">
          No other fixtures in this competition yet.
        </p>
      ) : (
        <ul className="mc-rail__body space-y-2">
          {rows.map((match) => (
            <OtherMatchRow key={String(match.matchId ?? match.id)} match={match} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Dedupe by match id.
 *
 * The same fixture arrives from more than one list (the competition list and the live
 * list overlap), and a list key keyed on anything but the id produced the same match
 * twice in the rail.
 */
function dedupe(matches: Match[]): Match[] {
  const seen = new Set<string>();
  const out: Match[] = [];
  for (const match of matches) {
    const id = String(match.matchId ?? match.id ?? '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(match);
  }
  return out;
}

function OtherMatchRow({ match }: { match: Match }) {
  const id = String(match.matchId ?? match.id ?? '');
  // The list row carries everything the rail shows, so no detail request is made.
  const board = scoreboardFromMatch(match);
  const isLive = String(match.status) === 'live';
  const isCompleted = String(match.status) === 'completed' || String(match.status) === 'ended';
  const isUpcoming = String(match.status) === 'upcoming';
  const date = formatShortDate(match.scheduled);

  return (
    <li>
      <Link href={`/matches/${encodeURIComponent(id)}`} prefetch={false} className="mc-other-match group">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-stext">
            {match.tournament ?? 'Cricket'}
          </span>
          {isLive ? <LiveIndicator label="Live" /> : <StatusBadge status={match.status} />}
        </div>

        <div className="mt-1.5 space-y-1">
          <RailTeamRow
            name={board.home.name}
            code={board.home.code}
            score={isUpcoming ? '' : board.homeScore}
          />
          <RailTeamRow
            name={board.away.name}
            code={board.away.code}
            score={isUpcoming ? '' : board.awayScore}
          />
        </div>

        <p className="mt-1.5 truncate text-[11px] font-semibold text-accent">
          {isCompleted
            ? describeMatchResult(match)
            : isLive && board.oversLabel
              ? `${board.battingLabel ? `${board.battingLabel} · ` : ''}${board.oversLabel} ov`
              : date}
        </p>
        <ChevronRight
          size={14}
          aria-hidden="true"
          className="mc-other-match__chev"
        />
      </Link>
    </li>
  );
}

function RailTeamRow({ name, code, score }: { name: string; code: string; score: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <TeamLogo code={code} name={name} size="xs" link={false} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-mtext" title={name}>
        {name}
      </span>
      {score ? (
        <span className="shrink-0 tabular-nums text-xs font-bold text-mtext">{score}</span>
      ) : null}
    </div>
  );
}
