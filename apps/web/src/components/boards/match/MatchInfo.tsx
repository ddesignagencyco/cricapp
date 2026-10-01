'use client';

import { Info } from 'lucide-react';
import { MatchSectionCard } from './MatchSectionCard';
import { TeamLink, TournamentLink } from '../../EntityLinks';
import { formatVenueDate, formatVenueTime, timeZoneLabel } from './matchFormat';
import { rate } from './matchFormat';
import type { ReactNode } from 'react';
import type { MatchViewModel } from '../../../lib/matchViewModel';

/**
 * The full fixture record.
 *
 * ## Not a database dump
 *
 * Every row here is a labelled fact a reader could ask about, with the value
 * formatted for reading — the toss as a sentence, the start time with the venue's
 * zone, the run rate to two decimals. The previous version rendered the raw values
 * of absent fields, so a fixture with no competition was headed "undefined" and one
 * with no venue read "TBA".
 *
 * Rows with no real value are **omitted**, not filled with a dash. A shorter list
 * that is entirely true beats a longer one containing nine em dashes.
 */
export default function MatchInfo({ view }: { view: MatchViewModel }) {
  const date = formatVenueDate(view.scheduled, view.timeZone);
  const time = formatVenueTime(view.scheduled, view.timeZone);
  const zone = timeZoneLabel(view.timeZone);

  const rows: Array<{ label: string; value: ReactNode }> = [];

  if (view.tournament) {
    rows.push({
      label: 'Tournament',
      value: view.tournamentId ? (
        <TournamentLink
          tournamentId={view.tournamentId}
          name={view.tournament}
          className="transition-colors hover:text-accent"
        />
      ) : (
        view.tournament
      ),
    });
  }
  if (view.seasonName) rows.push({ label: 'Series', value: view.seasonName });
  if (view.matchNumber) rows.push({ label: 'Match number', value: String(view.matchNumber) });
  if (view.formatLabel) {
    rows.push({
      label: 'Format',
      value: view.oversLimit && view.oversLimit > 0 ? `${view.formatLabel} · ${view.oversLimit} overs` : view.formatLabel,
    });
  }
  rows.push({ label: 'Status', value: view.statusLabel });
  rows.push({
    label: 'Home team',
    value: <TeamLink teamId={view.home.id} name={view.home.name} className="transition-colors hover:text-accent" />,
  });
  rows.push({
    label: 'Away team',
    value: <TeamLink teamId={view.away.id} name={view.away.name} className="transition-colors hover:text-accent" />,
  });
  if (date) {
    rows.push({
      label: 'Start',
      value: (
        <span className="tabular-nums">
          {date}
          {time ? ` · ${time}` : ''}
          {zone ? ` ${zone}` : ''}
        </span>
      ),
    });
  }
  if (view.venue) {
    rows.push({
      label: 'Venue',
      value: [view.venue, view.venueCity, view.venueCountry].filter(Boolean).join(', '),
    });
  }
  if (view.tossText) rows.push({ label: 'Toss', value: view.tossText });
  if (view.innings.length > 0) {
    rows.push({
      label: 'Innings',
      value: (
        <span className="tabular-nums">
          {view.innings.length}
          {view.innings.length === 4 ? ' (Test)' : ''}
        </span>
      ),
    });
  }
  const current = view.currentInnings;
  if (current?.runRate) {
    rows.push({ label: 'Current run rate', value: <span className="tabular-nums">{rate(current.runRate)}</span> });
  }
  if (view.target !== null) {
    rows.push({ label: 'Target', value: <span className="tabular-nums">{view.target}</span> });
  }
  if (view.requiredRunRate) {
    rows.push({ label: 'Required run rate', value: <span className="tabular-nums">{rate(view.requiredRunRate)}</span> });
  }
  if (view.winnerName) rows.push({ label: 'Winner', value: view.winnerName });
  if (view.result) rows.push({ label: 'Result', value: view.result });
  if (view.isOver && view.statusReason) rows.push({ label: 'Official status', value: view.statusReason });

  return (
    <MatchSectionCard icon={Info} title="Match Info">
      <dl className="mc-info">
        {rows.map((row) => (
          <div key={row.label} className="mc-info__row">
            <dt className="mc-info__label">{row.label}</dt>
            <dd className="mc-info__value">{row.value}</dd>
          </div>
        ))}
      </dl>
    </MatchSectionCard>
  );
}
