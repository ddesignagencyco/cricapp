'use client';

import Link from 'next/link';
import { CalendarClock, MapPin, Trophy } from 'lucide-react';
import { StatusBadge } from '../../Badge';
import TeamLogo from '../../TeamLogo';
import FavoriteButton from '../../FavoriteButton';
import ShareButton from '../../ShareButton';
import { TournamentLink, TeamLink } from '../../EntityLinks';
import { formatVenueDate, formatVenueTime, ordinalInnings, timeZoneLabel } from './matchFormat';
import type { MatchViewModel } from '../../../lib/matchViewModel';

/**
 * The page heading: breadcrumb, the fixture's name, and the facts about it.
 *
 * Every value is real and every one is optional. A missing tournament is simply not
 * rendered — the previous version printed the raw value of an absent field, so a
 * fixture with no competition was headed "undefined". Where the API does state a
 * competition, it links to it; where it does not, the item is dropped rather than
 * filled with a placeholder.
 */
export default function MatchPageHeader({
  view,
  matchId,
}: {
  view: MatchViewModel;
  matchId: string;
}) {
  const date = formatVenueDate(view.scheduled, view.timeZone);
  const time = formatVenueTime(view.scheduled, view.timeZone);
  const zone = timeZoneLabel(view.timeZone);

  return (
    <header className="mc-header">
      <nav aria-label="Breadcrumb" className="mc-breadcrumb">
        <ol className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs">
          <li>
            <Link href="/" className="transition-colors hover:text-accent">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-stext">
            /
          </li>
          <li>
            <Link href="/matches" className="transition-colors hover:text-accent">
              Matches
            </Link>
          </li>
          {view.tournament ? (
            <>
              <li aria-hidden="true" className="text-stext">
                /
              </li>
              <li className="min-w-0 truncate">
                {view.tournamentId ? (
                  <TournamentLink
                    tournamentId={view.tournamentId}
                    name={view.tournament}
                    className="transition-colors hover:text-accent"
                  />
                ) : (
                  <span>{view.tournament}</span>
                )}
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          {/*
            The heading is the two teams and nothing else. A ", Match 5" suffix is
            only meaningful to someone already looking at that competition, and it made
            the largest text on the page carry a number the reader did not ask for; the
            competition and the match number are both in the metadata row below, where
            they belong.
          */}
          <h1 className="mc-title">
            <TeamLink
              teamId={view.home.id}
              name={view.home.name}
              className="transition-colors hover:text-accent"
            />
            <span className="mc-title__vs">vs</span>
            <TeamLink
              teamId={view.away.id}
              name={view.away.name}
              className="transition-colors hover:text-accent"
            />
          </h1>

          <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stext">
            {view.formatLabel ? (
              <li className="font-semibold text-mtext">{view.formatLabel}</li>
            ) : null}
            {view.oversLimit && view.oversLimit > 0 ? (
              <li>
                {view.oversLimit} overs a side
                {view.multiInnings ? ', multi-innings' : ''}
              </li>
            ) : view.multiInnings ? (
              <li>Multi-innings</li>
            ) : null}
            {view.venue ? (
              <li className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin size={12} strokeWidth={2.4} aria-hidden="true" className="shrink-0 text-accent" />
                <span className="truncate">
                  {view.venue}
                  {view.venueCity ? `, ${view.venueCity}` : ''}
                </span>
              </li>
            ) : null}
            {date ? (
              <li className="inline-flex items-center gap-1.5">
                <CalendarClock size={12} strokeWidth={2.4} aria-hidden="true" className="shrink-0 text-accent" />
                <span className="tabular-nums">{date}</span>
                {time ? (
                  <span className="tabular-nums text-mtext">
                    {time}
                    {zone ? ` ${zone}` : ''}
                  </span>
                ) : null}
              </li>
            ) : null}
            {view.multiInnings && view.innings.length > 1 ? (
              <li className="tabular-nums">
                {view.innings.length} innings
                {view.innings.length === 4 ? ' (Test)' : ''}
              </li>
            ) : null}
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={view.status} />
          <FavoriteButton targetType="match" targetId={matchId} compact />
          <ShareButton
            type="match"
            id={matchId}
            fallbackTitle={`${view.home.name} vs ${view.away.name}`}
            compact
          />
        </div>
      </div>
    </header>
  );
}

/**
 * The scoreboard.
 *
 * ## Why this reads from the innings list
 *
 * Each side shows the **latest innings that side batted**, taken from
 * `view.headline`, and a completed match additionally shows every earlier innings
 * in a strip underneath.
 *
 * The alternative — printing `teams.home.score` — is what this page used to do, and
 * for a Test that field holds a two-innings aggregate: a real Border-Gavaskar Test
 * returns `342/10 (58.4)` for a side whose actual fourth innings was `238/10
 * (58.4)`. One number, two overs figures and neither one describing a real innings.
 * Reading the innings list means the hero, the comparison bars, the scorecard and
 * the match info are all printing the same value, because they are all reading the
 * same list.
 */
export function MatchScoreboard({
  view,
  matchId,
}: {
  view: MatchViewModel;
  matchId: string;
}) {
  const showInningsStrip = view.innings.length > 2;

  return (
    <section className="mc-board" aria-label="Scoreboard">
      <div className="mc-board__grid">
        <ScoreSide view={view} side="home" />
        <div className="mc-board__vs" aria-hidden="true">
          <span>vs</span>
        </div>
        <ScoreSide view={view} side="away" />
      </div>

      {showInningsStrip ? (
        <ol className="mc-innings-strip" aria-label="Innings by number">
          {view.innings.map((inn) => {
            const isHome = inn.side === 'home';
            const side = isHome ? view.home : view.away;
            const other = isHome ? view.away : view.home;
            return (
              <li
                key={inn.number}
                className={`mc-innings-strip__item ${isHome ? 'mc-innings-strip__item--home' : ''}`.trim()}
              >
                <span className="mc-innings-strip__no">{ordinalInnings(inn.number)}</span>
                <span className="mc-innings-strip__team">
                  <TeamLogo
                    code={side.code}
                    name={side.name}
                    teamId={side.id ?? undefined}
                    size="xs"
                    link={false}
                    className="h-4 w-4"
                  />
                  <span className="truncate">{side.name || other.name}</span>
                </span>
                <span className="mc-innings-strip__score tabular-nums">{inn.score}</span>
                {inn.oversLabel ? (
                  <span className="mc-innings-strip__overs tabular-nums">{inn.oversLabel} ov</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="mc-board__result" role="status">
        {/*
          The winner and the result are never both spelled out when the result line
          already names the winner — the API's own text is "India won by 295 runs", so
          prefixing "India won" to it produced "India won — India won by 295 runs".
          The trophy is kept because it is the visual marker of a decided match; the
          words come from whichever source actually has a full sentence.
        */}
        {view.phase === 'completed' ? (
          <span className="inline-flex items-center gap-1.5">
            <Trophy size={13} strokeWidth={2.4} aria-hidden="true" className="shrink-0" />
            <span>{view.result ?? (view.winnerName ? `${view.winnerName} won` : 'Match completed')}</span>
          </span>
        ) : (
          <span className="mc-board__situation">{view.situation}</span>
        )}
      </div>

      {view.isLive && view.currentInnings?.runRate ? (
        <p className="mc-board__rate">
          Current run rate{' '}
          <span className="tabular-nums font-semibold text-mtext">
            {view.currentInnings.runRate.toFixed(2)}
          </span>
          {view.requiredRunRate ? (
            <>
              {' · '}Required <span className="tabular-nums font-semibold text-mtext">{view.requiredRunRate.toFixed(2)}</span>
            </>
          ) : null}
        </p>
      ) : null}

      <p className="sr-only">
        {`Match id ${matchId}. ${view.home.name} versus ${view.away.name}.`}
        {view.headline.home?.score ? ` ${view.home.name} ${view.headline.home.score}.` : ''}
        {view.headline.away?.score ? ` ${view.away.name} ${view.headline.away.score}.` : ''}
        {view.situation}
      </p>
    </section>
  );
}

function ScoreSide({ view, side }: { view: MatchViewModel; side: 'home' | 'away' }) {
  const team = side === 'home' ? view.home : view.away;
  const headline = side === 'home' ? view.headline.home : view.headline.away;
  const isBatting = view.isLive && view.battingSide === side;
  const isWinner = view.isCompleted && view.winnerSide === side;
  const runs = headline ? headline.score : '';

  return (
    <div className={`mc-side ${side === 'away' ? 'mc-side--away' : ''}`.trim()}>
      <div className="flex min-w-0 items-center gap-3">
        <TeamLogo
          code={team.code}
          name={team.name}
          teamId={team.id ?? undefined}
          size="lg"
          className="h-12 w-12 sm:h-14 sm:w-14"
        />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-1.5">
            <TeamLink
              teamId={team.id}
              name={team.name}
              className="truncate text-sm font-bold text-mtext sm:text-base"
            />
            {isBatting ? <span className="mc-chip mc-chip--live">Batting</span> : null}
            {isWinner ? (
              <span className="mc-chip mc-chip--winner">
                <Trophy size={10} strokeWidth={2.6} aria-hidden="true" />
                Winner
              </span>
            ) : null}
          </p>
          {runs ? (
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
              <span className="mc-score tabular-nums">{runs}</span>
              {headline?.oversLabel ? (
                <span className="tabular-nums text-xs text-stext sm:text-sm">
                  ({headline.oversLabel} ov)
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-stext">
              {view.isUpcoming ? 'Yet to start' : 'No score recorded'}
            </p>
          )}
          {headline && headline.runRate ? (
            <p className="mt-0.5 text-[11px] text-stext">
              RR <span className="tabular-nums">{headline.runRate.toFixed(2)}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
